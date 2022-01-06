import { IsEmail, Length } from "class-validator";
import { Arg, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getRepository, Repository } from "typeorm";
import { User } from "../entity/user.entity";
import { hash, compareSync } from 'bcryptjs';
import { sign, verify } from "jsonwebtoken";
import { environment } from '../config/environment';
import {enviarEmail} from "../servicios/email.servicio"

@InputType()
class UserInput {
    @Field()
    @Length(3, 64)
    fullName!: string
    @Field()
    @IsEmail()
    email!: string
    @Field()
    @Length(8, 254)
    password!: string
}

@ObjectType()
class RegisterOutput {
    @Field()
    user! : User;
    @Field()
    tokenValidacion! : String;
}

@InputType()
class LoginInput {
    @Field()
    @IsEmail()
    email!: string;
    @Field()
    password!: string;
}

@ObjectType()
class LoginOutput {
    @Field()
    userId!: number;
    @Field()
    jwt!: string;
}

@InputType()
class GetUserDataInput {
    @Field()
    id!: number;
}

@InputType()
class RecuperarClaveInput {
    @Field()
    email! : string;
}
@ObjectType()
class RecuperarClaveOutput{
    @Field()
    exito! : boolean;
    @Field()
    mensaje! : string;
    @Field()
    token! : string;
    @Field()
    emailPreviewURL? : string
}

@InputType()
class ValidarCorreoInput {
    @Field()
    token! : string
}
@ObjectType()
class ValidarCorreoOutput{
    @Field()
    estatus! : boolean;
    @Field()
    mensaje! : string;
}

@InputType()
class ReiniciarClaveInput{
    @Field()
    nuevaClave! : string;
    @Field()
    token! : string;
}
@ObjectType()
class ReiniciarClaveOutput{
    @Field()
    user! : User;
    @Field({nullable : true})
    mensaje! : String
    @Field({nullable : true})
    notificacionEmailPreview! : String
}

@InputType()
class GenerarTokenValidacionCorreoInput{
    @Field()
    email! : string;
}

@ObjectType()
class GenerarTokenValidacionCorreoOutput{
    @Field()
    token! : string;
    @Field()
    emailPreview! : string;
}


@Resolver()
export class AuthResolver {

    userRepository: Repository<User>;
    constructor() {
        this.userRepository = getRepository(User);
    }

    /* Registrar un nuevo usuario */
    @Mutation(() => RegisterOutput)
    async register(
        @Arg('input', () => UserInput) input: UserInput
    ): Promise<RegisterOutput | undefined> {
        try {
            console.log("!------- Registrar nuevo usuario ");
            console.log("Parametros : ", input);
            const { fullName, email, password } = input;
            // existe otro usuario con el mismo email ? ...
            const userExists = await this.userRepository.findOne({ where: { email } });
            if (userExists) {
                const error = new Error("El email ya esta registrado con otro usuario");
                console.log(error.message);
                throw error;
            }
            // guardar el nuevo usuario 
            const hashedPassword = await hash(password, 10);
            const insertResultado = await this.userRepository.insert({
                fullName,
                email,
                password: hashedPassword,
                valido : false
                
            })
            // recuperar el nuevo usuario creado
            const nuevoUsuarioCreado  = await this.userRepository.findOne(insertResultado.identifiers[0].id);
            if (!nuevoUsuarioCreado) {
                const error = new Error("El nuevo usuario no pudo ser encontrado , ID : "  + insertResultado.identifiers[0].id);
                console.log(error.message);
                throw error;
            }
            // toquen de validación de dirección de correo
            const tokenValidacion = sign({ id: nuevoUsuarioCreado.id }, environment.JWT_SECRET);
            // enviar email de validación
            const respuestaEnvioEmail = await enviarEmail({
                asunto : "Biblioteca Virtual - Validacion de correo electronico",
                mensaje : "Valida tu direccion de correo, TOKEN : " + tokenValidacion,
                direccion : email
            });
            console.log("El mail para validar la cuanta de correo fue enviado !")
            // retorno del procedimiento
            return {
                user : nuevoUsuarioCreado,
                tokenValidacion : tokenValidacion 
            }
        } catch (error) {
            throw error;
        }
    }

    /* Validar una cuenta de correo pasando como parametro un token*/
    @Mutation( () => ValidarCorreoOutput ) 
        async validarCorreo( @Arg("input", () => ValidarCorreoInput ) input : ValidarCorreoInput 
    ){
        console.log("!----- VALIDAR CORREO ");
        console.log("Parametros: ", input)
        try {
            // los datos que vienen dentro del token (user.id)
            const payload = verify( input.token, environment.JWT_SECRET ) as any;
            console.log("USER ID ? ", payload.id );
            // buscar el usuario que tiene ese id
            const userFound = await this.userRepository.findOne(payload.id);
            // existe el usuario ? ...
            if (!userFound){
                const error = new Error("El usuario con el ID : " + payload.id + " no existe !");
                console.log(error.message);
                throw error;
            }
            // la direccion de correo ya fue validada ? ...
            if (userFound.valido){
                const respuesta = new ValidarCorreoOutput();
                respuesta.estatus = false;
                respuesta.mensaje = "El email ya fue validado anteriormente !"
                console.log(respuesta.mensaje);
                return respuesta;
            }
            // actualizar el estado de validación del usuario 
            const resultadoUpdate = await this.userRepository.update({ id : userFound.id }, { valido : true});
            if (!resultadoUpdate){
                const error = new Error("Error al intentar actualizar el usuario");
                console.log(error.message);
                throw error;
            }
            // respuesta del procedimiento y FIN
            const respuesta = new ValidarCorreoOutput();
            respuesta.estatus = true;
            respuesta.mensaje = "Validación de correo con exito!"
            console.log(respuesta.mensaje);
            return respuesta;
        } catch (error) {
            throw error;
        }
    }

    /* Generar un toquen de validación de correo */
    @Query( () => GenerarTokenValidacionCorreoOutput)
    async generarTokenValidacionCorreo(
        @Arg('input', () => GenerarTokenValidacionCorreoInput) input: GenerarTokenValidacionCorreoInput
    ){
        try {
            console.log("! ----- Generar nuevo token de validación de correo");
            // existe un usuario con ese email? ...
            const usuario = await this.userRepository.findOne({ where : { email : input.email}});
            console.log("El usuario encontrado es : " + usuario);
            if (!usuario){
                const error = new Error("No existe usuario registrado con ese email : " + input.email);
                console.log(error.message);
                throw error;
            }
            // el usuario ya valido su correo antes ? ...
            if (usuario?.valido){
                const error = new Error("El usuario ya valido su email anteriormente");
                console.log(error.message);
                throw error;
            }
            // generar un toque de validación que dura 5 minutos
            const tokenValidacion = sign({ id: usuario.id }, environment.JWT_SECRET,{ expiresIn: '5m' });
            // enviar un email con el token generado para ser usado con el mutador "validarCorreo"
            const respuestaEnvioEmail = await enviarEmail({
                asunto : "Biblioteca Virtual - Tu token para validar tu correo",
                mensaje : "Valida tu direccion de correo usando este token: <br/><br/><b>" + tokenValidacion + "</b><br/><br/> Junto al mutador <b>validarCorreo</b>",
                direccion : usuario.email
            });
            // respuesta del procedimiento 
            const respuesta = new GenerarTokenValidacionCorreoOutput();
            respuesta.emailPreview = respuestaEnvioEmail.previewURL;
            respuesta.token = tokenValidacion;
            console.log(respuesta);
            return respuesta;
        }catch(error){
            throw error;
        }
    }   

    /* Login  */
    @Mutation(() => LoginOutput)
    async login(
        @Arg('input', () => LoginInput) input: LoginInput
    ) {
        try {
            const { email, password } = input;
            const userFound = await this.userRepository.findOne({ where: { email } });
            // existe el usuario ? ...
            if (!userFound) {
                const error = new Error();
                error.message = 'Invalid credentials';
                throw error;
            }
            // la contraseña es correcta ? ... 
            const isValidPasswd: boolean = compareSync(password, userFound.password);
            if (!isValidPasswd) {
                const error = new Error();
                error.message = 'Invalid credentials';
                throw error;
            }
            // valido su direccion de correo ? ... 
            if (!userFound.valido){
                const error = new Error("Falta validar la direccion de correo !")
                console.log(error.message);
                throw error;
            }
            // genero el toquen de usuario autorizado
            const jwt: string = sign({ id: userFound.id }, environment.JWT_SECRET, { expiresIn: '60m'});
            // respuesta del login
            return {
                userId: userFound.id,
                jwt: jwt,
            }
        } catch (error) {
            throw error;
        }
    }

    /* Recupera todo los usuarios guardados */
    @Query( ()=> [User] )
    async getAllUsers(): Promise<User[]> {
        try{
            return await this.userRepository.find();
        }catch (error ){
            throw error;
        }
    }

   /* Recuperar un usuario , buscando por ID */
    @Query( ()=> User)
    async getUserData(
        @Arg('input', ()=> GetUserDataInput ) input : GetUserDataInput
    ) : Promise<User | undefined>{
        console.log("! ----- Recuperar información del usuario ID : " , input.id);
        try{
            const usuarioBuscado = await this.userRepository.findOne(input.id);
            if (!usuarioBuscado){
                const error = new Error("El usuario con el ID : " + input.id + " no existe !");
                throw error;
            }
            return usuarioBuscado;
        }catch(error:any){
            //console.log(error.message);
            throw error;
            }
    }

    /* Recuperar clave de usuario via mail */
    @Query( () => RecuperarClaveOutput)
    async recuperarClave ( @Arg("input", ()=> RecuperarClaveInput )  input : RecuperarClaveInput ) {
        console.log("! ----- Recuperar Contraseña ")
        const usuario = await this.userRepository.findOne({where : { email : input.email}});
        // existe algun usuario con ese email ? ...
        if (!usuario){
            const errorEmailInvalido = new Error();
            errorEmailInvalido.message = "El email " + input.email + " no pertenece a ningun usuario registrado";
            throw errorEmailInvalido;
        }
        // generar token para reiniciar la clave de usuario
        const tokenReinicioClave : string = sign({ id: usuario!.id }, environment.JWT_SECRET, { expiresIn: '5m' });
        console.log("Token de reinicio de clave: " , tokenReinicioClave);
        // enviar email con el token 
        var mensajeEmail = "Tu token de reinicio es : <b>" + tokenReinicioClave + "</b><br/><br/>";
        mensajeEmail += "El segundo paso es usar el mutador <b>reiniciarClave( tokenDeReinicio, nuevaClave )<b>";
        const respuestaData = await enviarEmail({
            asunto : "Biblioteca Virtual - Recuperar contraseña",
            mensaje : mensajeEmail,
            direccion : usuario.email
        })
        // respuesta del procedimiento
        if (respuestaData.exito){
            let respuesta = new RecuperarClaveOutput();
            respuesta.exito = true;
            respuesta.mensaje = "Las instrucciones para recuperar/reiniciar la contraseña fueron enviadas a " + input.email;
            respuesta.token = tokenReinicioClave;
            respuesta.emailPreviewURL = respuestaData.previewURL || "";
            return respuesta;
        }else{
            const errorEnvioFallido = new Error();
            errorEnvioFallido.message = respuestaData.mensaje;
            throw errorEnvioFallido;
        } 
    }

    /* Reinicio de la clave de usuario  */
    @Mutation( () => ReiniciarClaveOutput)
    async reiniciarClave( @Arg("input", ()=>ReiniciarClaveInput) input : ReiniciarClaveInput) : Promise< ReiniciarClaveOutput | undefined>{
        try{
            console.log("! ----- Reiniciar contraseña ");
            const tokenPayload = verify(input.token, environment.JWT_SECRET) as any;
            console.log("User ID ? " , tokenPayload.id);
            // el token contiene un ID de usuario ? ...
            if (!tokenPayload.id){
                const error = new Error();
                error.message = "El token no contiene la propiedad ID de usuario";
                throw error;
            }
            // recupero el usuario al que se quiere modificar
            const usuario = await this.userRepository.findOne(tokenPayload.id);
            // ... el usuario existe ?
            if (!usuario){
                const error = new Error();
                error.message = "El usuario con el ID : " , tokenPayload.id , " no existe";
                throw error;
            }
            // hasheo de clave
            usuario.password =  await hash(input.nuevaClave, 10);
            // update del usuario
            const usuarioUpdate = await this.userRepository.save(usuario);
            console.log("Contraseña actualizada, usuario : " , usuario);
            // envio de mail con notificacion de cambio de clave
            console.log("Enviando notificacion por email ... ");
            const emailRespuesta = await enviarEmail({
                asunto : "Biblioteca Virtual - Notificación de cambio de clave",
                mensaje : "<b>"+ usuario.fullName + "</b> tu clave fue remplada con exito , tu nueva clave es: <b>" + input.nuevaClave + "</b",
                direccion : usuario.email
            })
            // retorno del procedimiento 
            const resultadoOutput = new ReiniciarClaveOutput();
            resultadoOutput.mensaje = "La clave de usuario fue remplazada con exito!" 
            resultadoOutput.user = usuario;
            resultadoOutput.notificacionEmailPreview = emailRespuesta.previewURL!;
            return resultadoOutput;
        }catch(error){
            throw error;
        }
    }   
}
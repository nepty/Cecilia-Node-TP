import { Resolver, Query, Mutation, Arg, InputType, Field, Args, UseMiddleware, ObjectType} from 'type-graphql';
import { getRepository, IsNull, Repository } from 'typeorm';
import { IContext, isAuth } from '../middlewares/auth.middleware';
import { Alquiler } from "../entity/alquiler.entity";
import {Book} from "../entity/book.entity";
import {User} from "../entity/user.entity";

@InputType()
class NuevoAlquierInput {
    @Field()
    book! : number
    @Field()
    user! : number
}

@InputType()
class GetAlquileresByUserInput{
    @Field()
    usuarioID! : number
}

@InputType()
class DevolverLibroInput{
    @Field()
    libroID! : number
}
@ObjectType()
class DevolverLibroOutput{
    @Field()
    book! : Book;
    @Field()
    alquiler! : Alquiler;
    @Field()
    multa? : Number;
    @Field()
    mensaje? : String
}

@Resolver()
export class AlquilerResolver{

    alquilerRepositorio : Repository<Alquiler>          // Repositorio uso para guardar y consultar los ALQUILERES
    bookRepositorio : Repository<Book>                  // Repositorio que uso para consultar los LIBROS
    userRepositorio : Repository<User>                  // Repositorio para consultar usuarios

    // En el constructor de la clase AlquileresResolver hago ...
    constructor(){
        // Recupero los repositorios para Alquiler, Book, User
        this.alquilerRepositorio = getRepository(Alquiler);
        this.bookRepositorio = getRepository(Book);
        this.userRepositorio = getRepository(User);
    }

    /* Crea un nuevo alquiler */
    @Mutation( () => Alquiler)
    @UseMiddleware(isAuth)
    async crearAlquiler( @Arg("input", () => NuevoAlquierInput) input: NuevoAlquierInput ) : Promise<Alquiler | undefined> { // Promise<Alquiler | undefined>
        try {
            console.log("! -- Crear alquiler para el Libro (ID) : ", input.book, " Usuario ID: ", input.user);
            /* Busco si existe un libro con el ID que se paso como parametro,
            la busqueda es en el repositorio de libros (bookRepositorio) */
            const book : Book | undefined = await this.bookRepositorio.findOne(input.book);              
            // Si NO existe ... Muestro el mensaje de error y FIN
            if (!book) {      
                const error = new Error();
                error.message = 'El libro con ID : '+ input.book + " no existe !";
                console.log(error.message)                                                                          
                throw error;
            }
            /* ... ya esta alquilado ? */
            if (book.estaPrestado){
                // el libro está alquilado entonces retorno un mensaje de error y FIN
                const error = new Error();
                error.message = "El libro " + book.title + " (id: "+ book.id + ") está alquilado !";
                console.log(error.message);
                throw error;
            }else{
                // el libro esta disponible para alquiler
                console.log ("El libro ID :" , book.id , "esta disponible para alquilar !");
                // ahora tengo que averiguar si el USER existe
                const usuarioDatos = await this.userRepositorio.findOne(input.user); //{where: { id : input.user}} 
                if (!usuarioDatos){
                    // si el usuario no existe ... entonces es el fin del proceso y muestro un mensaje de error
                    const error = new Error();
                    error.message = "El usuario ID : " + input.user + " NO existe !";
                    console.log(error.message);
                    throw error;
                }
                // ... el usuario tiene otros alquileres ? si tiene 3 entonces no puede seguir alquilando 
                const alquileresPreexistentes = await this.alquilerRepositorio.find({where: { user : usuarioDatos.id, fechaDevolucion : IsNull()}});
                if (alquileresPreexistentes.length == 3){
                    const error = new Error("El usuario ya tiene tres (3) alquileres activos , no puede seguir alquilando!");
                    console.log(error);
                    throw error;
                }
                // guardado del nuevo registro de alquiler
                const fechaActual = new Date();
                const resultadoNuevoAlquiler = await this.alquilerRepositorio.insert({ 
                    book : book, 
                    user : usuarioDatos,
                    fechaInicial: fechaActual.toISOString()
                }); 
                /* actualizo el libro para que refleje su estado de alquilado y tenga el alquiler con su informacion */
                book.estaPrestado = true;
                book.alquiler = resultadoNuevoAlquiler.identifiers[0].id;
                await this.bookRepositorio.save(book);
                // recupero la informacion del nuevo alquiler y la retorno como resultado ... FIN
                const resultado = await this.alquilerRepositorio.findOne( resultadoNuevoAlquiler.identifiers[0].id, { relations : ['book','user'] } );  
                console.log("Registro de alquiler Complete ! ", resultado);
                return resultado;                                                                           
            }
        }catch(error){
            // Si se produce un error fuera de lo esperado
            console.log(error);
            throw error;                                                                          
        }
    }

    /* Recupera todos los alquileres */
    @Query(()=>[Alquiler])
    async getAllAlquileres(){
        try{
            console.log("Ver todos los alquileres:");
            const alquileres = await this.alquilerRepositorio.find({ relations : ['book','user'] } );
            console.log(alquileres)
            return alquileres;
        }catch{
            console.error;
        }
    }

    /*  Consultar todos los alquileres para un usuario, 
        se pasa como parametro el ID de usuario */
    @Query(()=>[Alquiler])
    async getAlquileresByUser(@Arg('input', () => GetAlquileresByUserInput) input: GetAlquileresByUserInput)
    {
        console.log("Buscar alquileres para el usuario ID: " , input.usuarioID);
        try{
            const consultaResultado = await this.alquilerRepositorio.find( { where : { user : input.usuarioID} , relations : ['book','user']} );
            console.log("Resultado : ", consultaResultado);
            return consultaResultado;
        }catch{
            const error = new Error();
            error.message = "Se produjo un error al recuperar los datos!";
            console.log(error.message);
            throw error;
        }
    }

    /*  Devolver un libro , se pasa como parametro el ID del libro */
    @Mutation(()=>DevolverLibroOutput)
    @UseMiddleware(isAuth)
    async devolverLibro(@Arg("input", () => DevolverLibroInput) input : DevolverLibroInput) {
        try {
            console.log("!--- Devolver libro" , input.libroID);
            console.log("Parametros : ", input);
            const book = await this.bookRepositorio.findOne(input.libroID,{relations: ['author','alquiler']});
            // ... el libro existe ?
            if (!book){
                const error = new Error("El libro (id:"+input.libroID+") no existe!");
                console.log(error);
                throw error;
            }
            // ... esta prestado ?
            if (!book.estaPrestado){
                const error = new Error("El libro " + book.title + " no esta prestado !");
                console.log(error);
                throw error;
            }
            // ... el registro de alquiler existe ?
            if (!book.alquiler){
                const error = new Error("No existe registro de alquiler para el libro "+ book.title + " (id:"+book.id+")");
                console.log(error);
                throw error;
            }
            // actualizo la informacion del registro de alquiler
            const fechaActual = new Date();
            book.alquiler.fechaDevolucion = fechaActual.toISOString();
            const alquilerUpdate = await this.alquilerRepositorio.save(book.alquiler);
            // actualizo el libro para que no figure como alquilado
            book.estaPrestado = false;
            book.alquiler = null;
            await this.bookRepositorio.save(book);
            // calcular la multa 
            const MULTA_VALOR_POR_DIA = 100;
            var diasTranscurridos = Math.floor((fechaActual.getTime() - new Date(alquilerUpdate.fechaInicial).getTime()) /  86400000);
            //var diasTranscurridos = Math.abs(fechaActual.getDate() -  new Date(alquilerUpdate.fechaInicial).getDate()); 
            var multa = diasTranscurridos > 7 ? (diasTranscurridos - 7) * MULTA_VALOR_POR_DIA : 0;
            console.log("Dias transcurridos desde el inicio del alquiler : ", diasTranscurridos, " valor de la multa : " + multa);
            // retorno del procedimiento 
            const retorno = new DevolverLibroOutput();
            retorno.book = book;
            retorno.alquiler = alquilerUpdate;
            retorno.multa = multa;
            retorno.mensaje = "El libro " + book.title + " fue devuelto con exito!. Cant. de dias: " + diasTranscurridos + " | Cant. dias extra: " + (diasTranscurridos - 7) + " / Multa : " + retorno.multa + " pesos ( " + MULTA_VALOR_POR_DIA + " pesos x dia )";
            return retorno;
        }catch(error){
            throw error;
        }
    }
}
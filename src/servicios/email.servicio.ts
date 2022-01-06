import { Field, InputType, ObjectType} from "type-graphql";
import { environment } from '../config/environment';

@InputType()
export class EnviarEmailInput{
    @Field()
    direccion! : string;
    @Field()
    asunto! : string;
    @Field()
    mensaje! : string
}

@ObjectType()
export class EnviarEmailOutput{
    @Field()
    exito! : boolean;
    @Field()
    mensaje! : string;
    @Field()
    previewURL! : string;
}

/* Procedimiento para el envio de un email */
export async function enviarEmail (input: EnviarEmailInput) : Promise<EnviarEmailOutput> {
    const nodemailer = require("nodemailer");
    try{
        let testAccount = await nodemailer.createTestAccount( (err:any, account:any ) => {
            if (err){
                const error = new Error("Error al crear el usuario/email de testeo : " + err.message);
                console.log(error.message);
                // return process.exit(1);
                throw error;
            }
        });
        let transporter = nodemailer.createTransport({
            host: environment.EMAIL_HOST,
            port: environment.EMAIL_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
            user: environment.EMAIL_USER,
            pass: environment.EMAIL_PASSWORD
            },
        });
        // Estructura del email
        let info = {
            from: '"Administracion Biblioteca" <admin@biblioteca_virtual.com>',     // sender address
            to: input.direccion,                                                    // list of receivers
            subject: input.asunto,                                                  // Subject line
            //text: input.mensaje,                                                  // plain text body
            html: input.mensaje,                                                    // html body
        };
    
        const resolverEnvio =  async function (){
            return new Promise( resolve => {
                transporter.sendMail(info, (err : any, info : any) => {
                if (err) {
                    console.log('Ocurrio un error al enviar el email :  ' + err.message);
                    resolve({exito:false, mensaje:err.message });
                }
                resolve({exito:true, mensaje : "Email enviado a " + input.direccion, previewURL: nodemailer.getTestMessageUrl(info)});
                console.log("Email enviado !")
                console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));             // Preview only available when sending through an Ethereal account
                console.log('Message sent: %s', info.messageId);
                })
            })
        }
    
        let resultado = Object(await resolverEnvio());
        let datosOutput = new EnviarEmailOutput();
        if (resultado['exito']){
            datosOutput.mensaje = resultado['mensaje'];
            datosOutput.previewURL = resultado['previewURL'];
        }else{
            datosOutput.exito = false;
            datosOutput.mensaje = resultado['mensaje'];
        }
        //console.log("Resultado de enviar el mail ? ", datosOutput)
        return datosOutput;
    }catch(error){
        throw error;
    }
}
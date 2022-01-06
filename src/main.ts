import { startServer } from './sever';
import { connect } from './config/typeorm';
import { environment } from './config/environment';
import { enviarAlertasDeAlquiler, enviarReporteAdministrativo } from "./servicios/administracion.servicio";

async function main() {
    connect()
    const app = await startServer();
    app.listen(environment.PORT);
    console.log("App running on port", environment.PORT);

    // ************** Tareas agendadas ****************
    const cron = require("node-cron");

    // reporte para administración
    // var administracionTask = cron.schedule('*/5 * * * * *', async function() {          // '0 0 * * Monday'  = Firma semanal , la tarea es todos los Lunes a las 00:00 // */1 * * * *
    //     console.log('!---- Reporte de Administración : Todos los Lunes a las 00:00 horas');
    //     const resultado = await enviarReporteAdministrativo();
    //     console.log("El reporte fue enviado");
    //   });
    // administracionTask.start();

    // reporte para usuarios
    // var alertaAlquileresTask = cron.schedule('*/10 * * * *', async function() {          // '10 0 * * Monday'  = Firma semanal , la tarea es todos los Lunes a las 00:10
    //     console.log('!---- Reporte de alertas de alquileres vencidos : Todos los Lunes a las 00:10 horas');
    //     const resultado = await enviarAlertasDeAlquiler();
    //     console.log("Todas las alertas fueron enviadas");
    //   });
    // alertaAlquileresTask.start();
}

main();























// Cronjob test !
    // const cron = require("node-cron");
    // console.log(cron)
    // var task1 = cron.schedule('*/1 * * * *', function() {
    //     console.log('Tarea cada 1 minuto!!!!');
    //   });
    // task1.start();

    // Nodemailer test !
    // const nodemailer = require("nodemailer");
    // nodemailer.createTestAccount( (err:any, account:any ) => {
    //     if (err){
    //         console.log("Error al crear el usuario test : ", err.message);
    //         return process.exit(1);
    //     }
    //     let transporter = nodemailer.createTransport({
    //         host: "smtp.ethereal.email",
    //         port: 587,
    //         secure: false, // true for 465, false for other ports
    //         auth: {
    //           user: 'leilani.schroeder20@ethereal.email' , //account.user, // generated ethereal user
    //           pass: 'PhZSRYWwwgRyv1Wad2' //account.pass, // generated ethereal password
    //         },
    //     });
    //     let info = {
    //         from: '"Fred Foo 👻" <admin@biblioteca.com>', // sender address
    //         to: "leilani.schroeder20@ethereal.email", // list of receivers
    //         subject: "Testing node mailer ✔", // Subject line
    //         text: "Funciona ???? ", // plain text body
    //         //html: "<b>Hello world?</b>", // html body
    //     };
    //     transporter.sendMail(info, (err : any, info : any) => {
    //         if (err) {
    //             console.log('Error occurred. ' + err.message);
    //             return process.exit(1);
    //         }
    //         console.log('Message sent: %s', info.messageId);
    //         // Preview only available when sending through an Ethereal account
    //         console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    //     });
    // });
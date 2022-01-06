import { enviarEmail, EnviarEmailRespuesta } from "./email.servicio";
import { getRepository, Repository } from "typeorm";
import { Book } from "../entity/book.entity"

// enviar el reporte administrativo
export async function enviarReporteAdministrativo () : Promise<EnviarEmailRespuesta>{
    console.log("!---- Enviar reporte administrativo");
    const bookRepository = getRepository(Book);
    const fechaActual = new Date();
    var asunto = "Biblioteca Virtual - Administracion - Reporte Semanal";
    var mensaje = "<b>REPORTE DE LIBROS EN ALQUILER</b><br/><br/>";
    // recuperar todos los libros en alquiler
    const librosAlquilados = await bookRepository.find({where:{estaPrestado:true},relations:["alquiler","alquiler.user"]});
    // para cada libro imprimir su informacion 
    librosAlquilados.forEach( (book : Book) => {
        let cantidadDias = Math.floor((fechaActual.getTime() - new Date(book.alquiler!.fechaInicial).getTime()) /  86400000);
        // Muestro Titulo del libro, fecha de alquiler, cantidad de dias transcurridos desde el inicio del alquiler ...
        mensaje += "<span style='color:" + (cantidadDias > 7 ? "red" : "black") + "'>" 
        mensaje += " <b>Titulo:</b> " + book.title + " <b>Usuario:</b> " + book.alquiler!.user.fullName + " <b>Email:</b> " + book.alquiler!.user.email;
        mensaje += " <b>Fecha de alquiler:</b> " + book.alquiler!.fechaInicial + " <b>Cantidad de dias:</b> " + cantidadDias 
        // .. y si el libro sobrepasa el limite de dias entonces muestro la multa
        if (cantidadDias > 7) mensaje += " <b>Multa:</b> " +  ((cantidadDias - 7 ) * 100);   
        mensaje += "</span> <br/><br/>" 
        console.log("BOOK? " , book.title, " cantida de dias ? " , cantidadDias , " fecha inicial : " , book.alquiler!.fechaInicial)
    })
    // enviar el reporte por email a administracion
    const respuestaEnvioEmail = await enviarEmail({
        asunto : asunto,
        mensaje : mensaje,
        direccion : "responsable@biblioteca_virtual.com"        // La direccion del que recibe el informe
    });
    console.log(respuestaEnvioEmail);
    return respuestaEnvioEmail
}

// enviar alerta de alquiler a los usuarios
export async function enviarAlertasDeAlquiler () : Promise<Object>{
    console.log("!---- Enviar alerta de alquileres vencidos !");
    const bookRepository = getRepository(Book);
    const fechaActual = new Date();
    // recuperar todos los libros en alquiler
    const librosAlquilados = await bookRepository.find({where:{estaPrestado:true},relations:["alquiler","alquiler.user"]});
    // para cada libro...
    for (let i = 0; i < librosAlquilados.length; i++){
        let book : Book = librosAlquilados[i];
        let cantidadDias = Math.floor((fechaActual.getTime() - new Date(book.alquiler!.fechaInicial).getTime()) /  86400000);
        if (cantidadDias > 7){
            let asunto = "Biblioteca Virtual - Alerta de alquiler vencido - Libro : " + book.title;
            // la alerta lleva el nombre del libro , la fecha de alquiler, la cantidad de dias transcurridos y la multa a pagar
            let mensaje = "<b>REPORTE DE ALQUILER VENCIDO</b><br/><br/>";
            mensaje += "<b>Titulo:</b> " + book.title + "<br/>";
            mensaje += "<b>Fecha de alquiler:</b> " + book.alquiler!.fechaInicial + "<br/>";
            mensaje += "<span style='color:red'><b>Cantidad de dias:</b> " + cantidadDias + "</span><br/>";
            mensaje += "<span style='color:red'><b>Multa:</b> " + ((cantidadDias - 7 ) * 100) + " pesos (100 pesos por día extra)</span><br/>";
            console.log("Alerta Libro: " , book.title, " cantidad de días ? " , cantidadDias , " fecha de alquiler : " , book.alquiler!.fechaInicial);
            // enviar la alerta por email al usuario
            const respuestaEnvioEmail = await enviarEmail({
                asunto : asunto,
                mensaje : mensaje,
                direccion : book.alquiler!.user.email
            });
            console.log(respuestaEnvioEmail);
        } 
    }
    return {
        estatus  : true,
        mensaje : "Alertas de alquileres vencidos enviadas !"
    }

}
import {Entity,Column, PrimaryGeneratedColumn, CreateDateColumn, OneToOne, JoinColumn, ManyToOne, } from "typeorm";
import {Book} from "./book.entity";
import { User } from "./user.entity";
import {Field, ObjectType} from "type-graphql";

@ObjectType()
@Entity()
export class Alquiler {

    // id del alquiler
    @Field()
    @PrimaryGeneratedColumn()
    id! : number                

    // el libro que fue alquilado
    @Field( () => Book)
    @ManyToOne(()=> Book, book => book)
    @JoinColumn()
    book! : Book
    
    // el usuario que alquilo el libro
    @Field( ()=> User)
    @ManyToOne( ()=> User, user => user)
    @JoinColumn()
    user! : User

    // la fecha del inicio del alquiler
    @Field(()=> String)
    @CreateDateColumn({type : "date"})
    fechaInicial! : string

    // la fecha de devolución, queda nula hasta el momento de la devolución
    @Field(()=> String, {nullable: true})
    @Column({type : "date" , nullable: true})
    fechaDevolucion! : string | null
    
}
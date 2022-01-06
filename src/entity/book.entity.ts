import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { Author } from './author.entity';
import { Alquiler } from './alquiler.entity';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
@Entity()
export class Book {
    @Field()
    @PrimaryGeneratedColumn()
    id!: number;

    @Field()
    @Column()
    title!: string;

    @Field(() => Author, { nullable: true })
    @ManyToOne(() => Author, author => author.books, { onDelete: 'CASCADE' })
    author!: Author;

    @Field()
    @Column()
    estaPrestado! : boolean;

    @Field( () => Alquiler, { nullable: true })
    @ManyToOne(() => Alquiler, alquiler => alquiler, { nullable: true , })
    alquiler!: Alquiler | null

    @Field()
    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: string;
}
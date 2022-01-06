import { Mutation, Resolver, Arg, InputType, Field, Query } from 'type-graphql';
import { Author } from '../entity/author.entity';
import { getRepository, Repository } from "typeorm";
import { Length, IsString } from 'class-validator';

@InputType()
class AuthorInput {
    @Field()
    @Length(3, 64)
    @IsString()
    fullName!: string
}

@InputType()
class AuthorUpdateInput {
    @Field(() => Number)
    id!: number
    @Field()
    fullName?: string
}

@InputType()
class AuthorIdInput {
    @Field(() => Number)
    id!: number
}

@Resolver()
export class AuthorResolver {

    authorRepository: Repository<Author>

    constructor() {
        this.authorRepository = getRepository(Author)
    }

    // Crea un autor
    @Mutation(() => Author)
    async createAuthor(
        @Arg("input", () => AuthorInput) input: AuthorInput
    ): Promise<Author | undefined> {
        console.log("!----- Crear nuevo usuario !");
        console.log("Parametros: ", input);
        try {
            // ... el autor ya se encuentr registrado ? (no valida minusculas o mayusculas , debería !)
            const autorBuscado = await this.authorRepository.findOne({where:{fullName : input.fullName}});
            // ... si ya esta registrado muestro un error
            if (autorBuscado){
                const error = new Error("ERROR: El autor = " + input.fullName + " ya se encuentra registrado!");
                console.log(error.message);
                throw error;
            }
            // Agrego el nuevo autor
            const createdAuthor = await this.authorRepository.insert({ fullName: input.fullName });
            const result = await this.authorRepository.findOne(createdAuthor.identifiers[0].id);
            console.log("Nuevo autor creado : ", result)
            return result;
        } catch (error){
            throw error; // Acá capturo los errores de más arriba
        }
    }

    // Recupera todos los autores con sus libros y cada libro con su estado de alquiler
    @Query(() => [Author])
    async getAllAuthors(): Promise<Author[]> {
        return await this.authorRepository.find({ relations: ['books','books.alquiler'] });
    }

    // Recupera todos los libro para un autor, cada libro lleva su estado de alquiler
    @Query(() => Author)
    async getOneAuthor(
        @Arg("input", () => AuthorIdInput) input: AuthorIdInput
    ): Promise<Author | undefined> {
        try {
            const author = await this.authorRepository.findOne(input.id, { relations: ['books','books.alquiler'] });
            if (!author) {
                const error = new Error();
                error.message = 'Author does not exist';
                throw error;
            }
            return author
        } catch (error) {
            throw error
        }
    }

    // Modica un autor
    @Mutation(() => Author)
    async updateOneAuthor(
        @Arg("input", () => AuthorUpdateInput) input: AuthorUpdateInput
    ): Promise<Author | undefined> {
        const authorExists = await this.authorRepository.findOne(input.id);
        if (!authorExists) {
            throw new Error('Auhtor does not exists')
        };
        const updatedAuthor = await this.authorRepository.save({
            id: input.id,
            fullName: input.fullName
        })
        return await this.authorRepository.findOne(updatedAuthor.id)
    }

    // Elimina un autor
    @Mutation(() => Boolean)
    async deleteOneAuthor(
        @Arg("input", () => AuthorIdInput) input: AuthorIdInput
    ): Promise<Boolean> {
        try {
            const author = await this.authorRepository.findOne(input.id);
            if (!author) throw new Error('Author does not exist');
            await this.authorRepository.delete(input.id);
            return true;
        } catch (error) {
            throw error;
        }

    }
}
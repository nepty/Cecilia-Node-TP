import { Mutation, Resolver, Arg, InputType, Field, Query, UseMiddleware, Ctx, ObjectType } from 'type-graphql';
import { getRepository, Repository } from "typeorm";
import { Author } from '../entity/author.entity';
import { Book } from '../entity/book.entity';
import { Length } from 'class-validator';
import { IContext, isAuth } from '../middlewares/auth.middleware';

@InputType()
class BookInput {
    @Field()
    @Length(3, 64)
    title!: string;
    @Field()
    author!: number;
}

@InputType()
class BookUpdateInput {
    @Field(() => String, { nullable: true })
    @Length(3, 64)
    title?: string;
    @Field(() => Number, { nullable: true })
    author?: number;
}

@InputType()
class BookUpdateParsedInput {
    @Field(() => String, { nullable: true })
    @Length(3, 64)
    title?: string;
    @Field(() => Author, { nullable: true })
    author?: Author;
}

@InputType()
class BookIdInput {
    @Field(() => Number)
    id!: number
}

@ObjectType()
class GetBookByIdOutput{
    @Field()
    book! : Book;
    @Field({nullable : true})
    fechaEstimadaDevolucion? : string;
}

@Resolver()
export class BookResolver {
    bookRepository: Repository<Book>;
    authorRepository: Repository<Author>

    constructor() {
        this.bookRepository = getRepository(Book);
        this.authorRepository = getRepository(Author);
    }

    /* Recupera todos los libros pero no muestra los que esten alquilados */
    @Query(() => [Book])
    @UseMiddleware(isAuth)
    async getAllBooks( ): Promise<Book[]> { // @Arg("input",()=> GetAllBooksInput) input : GetAllBooksInput
        try {
            return await this.bookRepository.find({ relations: ['author', 'author.books','alquiler'] , where : {estaPrestado : false} });
        } catch (error) {
            throw error
        }
    }

    /* Recupera un libro buscando por su ID , en el caso de estar alquilado tambien retorna la fecha estimada de devolucion */
    @Query(() => GetBookByIdOutput)
    @UseMiddleware(isAuth)
    async getBookById(
        @Arg('input', () => BookIdInput) input: BookIdInput
    ): Promise<GetBookByIdOutput | undefined> {
        try {
            const book = await this.bookRepository.findOne(input.id, { relations: ['author', 'author.books', 'alquiler'] });
            if (!book) {
                const error = new Error();
                error.message = 'Book not found';
                throw error;
            }
            const respuesta = new GetBookByIdOutput();
            respuesta.book = book;
            if (book.estaPrestado){
                let fechaEstimadaDevolucion = new Date(book.alquiler!.fechaInicial);
                fechaEstimadaDevolucion.setDate(fechaEstimadaDevolucion.getDate() + 7);
                respuesta.fechaEstimadaDevolucion = fechaEstimadaDevolucion.toISOString();
            }
            return respuesta;
        } catch (error) {
            throw error;
        }
    }

    /* Crea un libro */
    @Mutation(() => Book)
    async createBook(@Arg("input", () => BookInput) input: BookInput, @Ctx() context: IContext) {
        console.log("!----- Crear libro!")
        console.log("Parametros: ", input);
        try {
            // existe el autor ? ...
            const author: Author | undefined = await this.authorRepository.findOne(input.author);
            if (!author) {
                const error = new Error();
                error.message = 'The author for this book does not exist, please double check';
                throw error;
            }
            // guardar el libro
            const book = await this.bookRepository.insert({
                title : input.title,
                author : author,
                estaPrestado : false
            });
            // recupera la información del nuevo libro
            const nuevoLibro = await this.bookRepository.findOne(book.identifiers[0].id, { relations: ['author', 'author.books'] });
            console.log("Nuevo libro creado : " , nuevoLibro)
            return nuevoLibro; 
        } catch (error) {
            throw error
        }
    }

    /* Actualizar la información de un libro */
    @Mutation(() => Boolean)
    async updateBookById(
        @Arg('bookId', () => BookIdInput) bookId: BookIdInput,
        @Arg('input', () => BookUpdateInput) input: BookUpdateInput,
    ): Promise<Boolean> {
        try {
            await this.bookRepository.update(bookId.id, await this.parseInput(input));
            return true;
        } catch (error) {
            throw error
        }
    }

    /* Eliminar un libro */
    @Mutation(() => Boolean)
    async deleteBook(
        @Arg("bookId", () => BookIdInput) bookId: BookIdInput
    ): Promise<Boolean> {
        try {
            const result = await this.bookRepository.delete(bookId.id)
            if (result.affected === 0) throw new Error('Book does not exist');
            return true
        } catch (error) {
            throw error
        }
    }

    private async parseInput(input: BookUpdateInput) {
        try {
            const _input: BookUpdateParsedInput = {};
            if (input.title) {
                _input['title'] = input.title;
            }
            if (input.author) {
                const author = await this.authorRepository.findOne(input.author);
                if (!author) {
                    throw new Error('This author does not exist')
                }
                _input['author'] = await this.authorRepository.findOne(input.author);
            }
            return _input;
        } catch (error) {
            throw error;
        }
    }

}
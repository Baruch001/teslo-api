import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, Param } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from '../common/dtos/pagination.dto';

import { validate as isUUID} from 'uuid';

@Injectable()
export class ProductService {

  private readonly logger = new Logger('ProductsService');


  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

  ) { }

  async create(createProductDto: CreateProductDto) {
    try {

      const product = this.productRepository.create(createProductDto)
      await this.productRepository.save(product);

      return product;

    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  findAll(paginationDto:PaginationDto) {

    const { limit = 0, offset = 0} = paginationDto;

    return this.productRepository.find({
      take: limit,
      skip: offset
    });
  }

  async findOne(term: string) {

    let product:Product;

    if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy({ id:term })
    }else{
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title:term.toUpperCase(),
          slug:term.toUpperCase()
        }).getOne();
    }

    // const product = await this.productRepository.findOneBy({ id });

    if ( !product )
      throw new NotFoundException(`Product with id ${term} not found`);

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto
    });

    if(!product) throw new NotFoundException(`Product with id: ${id} not found`);

    try {
      
      await this.productRepository.save(product);
      return product;

    } catch (error) {
      this.handleDBExceptions(error)
    }

  }

  async remove(id: string) {
    const product = await this.findOne( id );

    await this.productRepository.remove( product );
  }

  private handleDBExceptions(error: any) {

    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error)
    // console.log(error)
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }

}

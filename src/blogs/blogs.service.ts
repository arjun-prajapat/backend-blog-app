import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { User } from '../users/entities/user.entity';
import { Role } from 'src/enum/role.enum';

@Injectable()
export class BlogsService {
  constructor(
    @InjectRepository(Blog)
    private blogRepository: Repository<Blog>,
  ) {}

  async create(createBlogDto: CreateBlogDto, user: User): Promise<Blog> {
    try {
      const blog = this.blogRepository.create({
        ...createBlogDto,
        authorId: user.id,
      });
      return await this.blogRepository.save(blog);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Blog slug already exists');
      }
      throw error;
    }
  }

  findAll(search?: string, categorySlug?: string): Promise<Blog[]> {
    const where: any = { isDeleted: false };
    
    if (search) {
      where.title = ILike(`%${search}%`);
      // You can add more complex search here if needed
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    return this.blogRepository.find({
      where,
      relations: ['author', 'category'],
      select: {
        author: {
          id: true,
          email: true,
          role: true,
        },
      },
    });
  }

  async findOne(slug: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({
      where: { slug, isDeleted: false },
      relations: ['author', 'category'],
      select: {
        author: {
          id: true,
          email: true,
          role: true,
        },
      },
    });

    if (!blog) {
      throw new NotFoundException(`Blog not found`);
    }

    return blog;
  }

  async findById(id: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['author', 'category'],
      select: {
        author: {
          id: true,
          email: true,
          role: true,
        },
      },
    });

    if (!blog) {
      throw new NotFoundException(`Blog not found`);
    }

    return blog;
  }

  async update(id: string, updateBlogDto: UpdateBlogDto, user: User): Promise<Blog> {
    const blog = await this.blogRepository.findOne({ where: { id, isDeleted: false } });
    
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (blog.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new UnauthorizedException('You are not authorized to update this blog');
    }

    this.blogRepository.merge(blog, updateBlogDto);

    try {
      return await this.blogRepository.save(blog);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Blog slug already exists');
      }
      throw error;
    }
  }

  async remove(id: string, user: User): Promise<void> {
    const blog = await this.blogRepository.findOne({ where: { id, isDeleted: false } });
    
    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    if (blog.authorId !== user.id && user.role !== Role.ADMIN) {
      throw new UnauthorizedException('You are not authorized to delete this blog');
    }

    await this.blogRepository.softDelete(id);
    await this.blogRepository.update(id, { isDeleted: true });
  }
}

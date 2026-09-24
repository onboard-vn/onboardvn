import type {
  CategoryCreateInput,
  CategoryDto,
  CategoryFilter,
  CategoryUpdateInput,
} from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import * as repo from './repo.js';

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export function listCategoriesService(filter: CategoryFilter = {}): Promise<CategoryDto[]> {
  return repo.listCategories(filter);
}

export async function createCategoryService(input: CategoryCreateInput): Promise<CategoryDto> {
  try {
    return await repo.insertCategory({
      name: input.name,
      nameVi: input.nameVi,
      kind: input.kind,
      bggId: input.bggId,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError('CONFLICT', 409, 'Thể loại đã tồn tại');
    throw err;
  }
}

export async function updateCategoryService(
  id: string,
  input: CategoryUpdateInput,
): Promise<CategoryDto> {
  const existing = await repo.findCategoryById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy thể loại');

  try {
    const updated = await repo.updateCategoryRow(id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.nameVi !== undefined && { nameVi: input.nameVi }),
      ...(input.kind !== undefined && { kind: input.kind }),
      ...(input.bggId !== undefined && { bggId: input.bggId }),
    });
    return updated!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError('CONFLICT', 409, 'Thể loại đã tồn tại');
    throw err;
  }
}

export async function deleteCategoryService(id: string): Promise<void> {
  const existing = await repo.findCategoryById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy thể loại');
  await repo.deleteCategoryRow(id);
}

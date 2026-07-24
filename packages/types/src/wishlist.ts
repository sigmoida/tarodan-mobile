import { ProductWithSeller } from './product';

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

export interface WishlistItemWithProduct extends WishlistItem {
  product: ProductWithSeller;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  coverImage?: string;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  productId: string;
  notes?: string;
  createdAt: Date;
}

export interface CollectionWithItems extends Collection {
  items: CollectionItemWithProduct[];
}

export interface CollectionItemWithProduct extends CollectionItem {
  product: ProductWithSeller;
}

export interface CreateCollectionDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  coverImage?: string;
}

export interface UpdateCollectionDto extends Partial<CreateCollectionDto> {}

export interface AddToCollectionDto {
  productId: string;
  notes?: string;
}

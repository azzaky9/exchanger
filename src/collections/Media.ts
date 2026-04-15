import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    hidden: true,
  },
  access: {
    read: ({ req: { user } }) =>
      user?.roles?.includes('admin') || user?.roles?.includes('user') || false,
    create: ({ req: { user } }) =>
      user?.roles?.includes('admin') || user?.roles?.includes('user') || false,
    update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}

import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    hidden: ({ user }) => !user?.roles?.includes('admin'),
  },
  auth: {
    useAPIKey: true,
  },
  access: {
    read: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    create: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
    update: ({ req: { user } }) => {
      if (user?.roles?.includes('admin')) return true
      return { id: { equals: user?.id } }
    },
    delete: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: ['user'],
      required: true,
      saveToJWT: true,
      access: {
        update: ({ req: { user } }) => user?.roles?.includes('admin') ?? false,
      },
    },
  ],
}

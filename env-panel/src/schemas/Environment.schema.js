import { z } from 'zod';

export const EnvironmentSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Name should be minimum 1 character long' })
    .max(20, { message: 'Name should be maximum 20 characters long' }),
  rpc: z.string().url({ message: 'RPC URL should be a valid URL' }),
});

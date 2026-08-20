import { z } from "zod";

import { isValidCpf, onlyDigits } from "./format";

export const checkoutSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("E-mail invalido"),
  phone: z
    .string()
    .refine((v) => onlyDigits(v).length >= 10, "Telefone invalido"),
  cpf: z.string().refine(isValidCpf, "CPF invalido"),
  cep: z.string().refine((v) => onlyDigits(v).length === 8, "CEP invalido"),
  street: z.string().min(3, "Informe a rua"),
  number: z.string().min(1, "Informe o numero"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Informe o bairro"),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().length(2, "Informe o UF"),
  voltage: z.enum(["127V", "220V"], { message: "Selecione a voltagem" }),
  shippingId: z.enum(["free", "express"]),
  orderBumpIds: z.array(z.string()),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

export const createPixSchema = checkoutSchema;

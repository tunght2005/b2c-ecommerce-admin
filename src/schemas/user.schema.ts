import { z } from 'zod'

/* ObjectId */
export const objectIdRegex = /^[0-9a-fA-F]{24}$/
export const ObjectIdSchema = z.string().regex(objectIdRegex, 'ObjectId không hợp lệ')

export const EmailSchema = z
  .string()
  .min(1, 'Vui lòng nhập email')
  .email('Email không hợp lệ')
  .max(160, 'Độ dài tối thiểu phải 5 - 160 ký tự')

/* Full name */
export const FullNameSchema = z
  .string()
  .min(1, 'Vui lòng nhập họ và tên')
  .max(120, 'Tên quá dài')
  .refine((v) => /[A-Za-zÀ-ỹĐđ]/.test(v), 'Tên phải có ký tự chữ')
  .refine((v) => !/^[\W_]+$/.test(v), 'Tên không hợp lệ')

/* Phone: chuẩn hoá trước rồi refine */
export const PhoneSchema = z
  .string()
  .refine((v) => /^(0\d{9}|(?:\+?84)\d{9})$/.test(v) || /^\+\d{8,15}$/.test(v), 'Số điện thoại không hợp lệ')

export const StrongPasswordSchema = z
  .string()
  .min(6, 'Mật khẩu tối thiểu 10 ký tự')
  .max(128, 'Mật khẩu quá dài (tối đa 128)')
  .refine((v) => !/\s/.test(v), 'Mật khẩu không được chứa khoảng trắng')
  .refine((v) => /[a-z]/.test(v), 'Phải có ít nhất 1 chữ thường')
  .refine((v) => /[A-Z]/.test(v), 'Phải có ít nhất 1 chữ hoa')
  .refine((v) => /\d/.test(v), 'Phải có ít nhất 1 chữ số')
  .refine((v) => /[^A-Za-z0-9]/.test(v), 'Phải có ít nhất 1 ký tự đặc biệt')
  // .refine((v) => !/(.)\1\1/.test(v), 'Không được lặp 1 ký tự ≥ 3 lần (aaa, !!!)')
  .refine(
    (v) => !/(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwerty)/i.test(v),
    'Hạn chế chuỗi dễ đoán (1234, abcd, qwerty, ...)'
  )

/*  Login  */
export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .nonempty('Nhập password là bắt buộc')
    .min(6, 'Độ dài tối thiểu phải 6 - 160 ký tự')
    .max(160, 'Độ dài tối thiểu phải 6 - 160 ký tự')
})
export type LoginInput = z.infer<typeof LoginInputSchema>

/*  Update profile (self) */
export const UpdateProfileInputSchema = z.object({
  username: FullNameSchema.optional(),
  email: EmailSchema.optional(),
  phone: PhoneSchema.optional()
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>

/* Change password */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: StrongPasswordSchema,
    confirmNewPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu')
  })
  .superRefine(({ newPassword, confirmNewPassword }, ctx) => {
    if (newPassword !== confirmNewPassword) {
      ctx.addIssue({
        path: ['confirmNewPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Mật khẩu xác nhận không khớp'
      })
    }
  })
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>

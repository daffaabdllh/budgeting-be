import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().nonempty("Name is required"),
    email: z.string().email("Invalid email"),
    phone_number: z.string().nonempty("Phone number is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirm_password: z.string().min(6, "Confirm password must be at least 6 characters long"),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    remember_me: z.boolean().default(false)
});

export type RegisterInputType = z.infer<typeof registerSchema>;
export type LoginInputType = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
    token: z.string().nonempty("Token is required"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirm_password: z.string().min(6, "Confirm password must be at least 6 characters long"),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

export type ForgotPasswordInputType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInputType = z.infer<typeof resetPasswordSchema>;

export const salaryDaySchema = z.object({
    salary_day: z.number().int().min(1).max(31, "Salary day must be between 1 and 31")
});

export type SalaryDayInputType = z.infer<typeof salaryDaySchema>;
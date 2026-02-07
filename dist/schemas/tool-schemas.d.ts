/**
 * @rpg-node Schemas - All Zod validation schemas for yar MCP tools
 * @rpg-deps zod
 * @rpg-flow Used by tools/ for input validation
 */
import { z } from "zod";
export declare const JoinSchema: z.ZodObject<{
    channel: z.ZodString;
    nickname: z.ZodString;
}, "strict", z.ZodTypeAny, {
    channel: string;
    nickname: string;
}, {
    channel: string;
    nickname: string;
}>;
export type JoinInput = z.infer<typeof JoinSchema>;
export declare const SaySchema: z.ZodObject<{
    channel: z.ZodString;
    text: z.ZodString;
}, "strict", z.ZodTypeAny, {
    channel: string;
    text: string;
}, {
    channel: string;
    text: string;
}>;
export type SayInput = z.infer<typeof SaySchema>;
export declare const ListenSchema: z.ZodObject<{
    channel: z.ZodString;
    timeout_seconds: z.ZodDefault<z.ZodNumber>;
    after_id: z.ZodOptional<z.ZodString>;
    mentions_only: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    channel: string;
    timeout_seconds: number;
    mentions_only: boolean;
    after_id?: string | undefined;
}, {
    channel: string;
    timeout_seconds?: number | undefined;
    after_id?: string | undefined;
    mentions_only?: boolean | undefined;
}>;
export type ListenInput = z.infer<typeof ListenSchema>;
export declare const LeaveSchema: z.ZodObject<{
    channel: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    channel?: string | undefined;
}, {
    channel?: string | undefined;
}>;
export type LeaveInput = z.infer<typeof LeaveSchema>;
//# sourceMappingURL=tool-schemas.d.ts.map
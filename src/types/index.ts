/* 

GROUP


*/

type Brand<T, U extends string> = T & { readonly [key in U]: never };

// 这两个类型应该从自生成的常量中推导出来的
export type GroupId = Brand<string, "GroupId">;
export type DivisionId = Brand<string, "DivisionId">;

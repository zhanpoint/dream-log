import type * as React from "react";

const reactHookForm = require("react-hook-form") as {
  useForm: <TFieldValues extends FieldValues = FieldValues>(...args: any[]) => any;
  Controller: React.ComponentType<any>;
  FormProvider: React.ComponentType<any>;
  useFormContext: <TFieldValues extends FieldValues = FieldValues>(...args: any[]) => any;
};

export const useForm = reactHookForm.useForm;
export const Controller = reactHookForm.Controller;
export const FormProvider = reactHookForm.FormProvider;
export const useFormContext = reactHookForm.useFormContext;

export type FieldValues = Record<string, any>;
export type FieldPath<_TFieldValues extends FieldValues = FieldValues> = string;
export type ControllerRenderProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  value: TFieldValues[keyof TFieldValues] | any;
  onChange: (...event: any[]) => void;
  onBlur: () => void;
  ref: any;
};

export type ControllerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  control?: any;
  defaultValue?: any;
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: any;
    formState: any;
  }) => React.ReactElement;
};

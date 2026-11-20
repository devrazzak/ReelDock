import { useId } from 'react';

import { Field, FieldContent, FieldDescription, FieldLabel, Switch } from '@rax-ds/ui';

interface SettingRowProps {
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export function SettingRow({ label, description, checked, disabled = false, onCheckedChange }: SettingRowProps) {
    const id = useId();
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <FieldDescription>{description}</FieldDescription>
            </FieldContent>
            <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
        </Field>
    );
}

import type { ComponentProps } from 'react';

// Media icons the design system does not ship yet. Same 24×24 grid and currentColor as its icons.
type IconProps = ComponentProps<'svg'>;

function Icon({ children, ...props }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" {...props}>
            {children}
        </svg>
    );
}

export const PlayIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.6-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
    </Icon>
);

export const PauseIcon = (props: IconProps) => (
    <Icon {...props}>
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
    </Icon>
);

export const PreviousIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M6 5h2v14H6zm3.5 7 8.5 6V6z" />
    </Icon>
);

export const NextIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M16 5h2v14h-2zM6 18l8.5-6L6 6z" />
    </Icon>
);

export const BackTenIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" />
        <text x="12" y="16.5" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
            10
        </text>
    </Icon>
);

export const ForwardTenIcon = (props: IconProps) => (
    <Icon {...props}>
        <path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" />
        <text x="12" y="16.5" fontSize="7" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">
            10
        </text>
    </Icon>
);

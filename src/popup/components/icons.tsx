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

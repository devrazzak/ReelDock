import { IconButton } from '@rax-ds/ui';

import type { PlayerCommand } from '@/shared/messages';
import type { PlaybackStatus } from '@/shared/status';

import { BackTenIcon, ForwardTenIcon, NextIcon, PauseIcon, PlayIcon, PreviousIcon } from './icons';

interface PlayerControlsProps {
    status: PlaybackStatus;
    onCommand: (command: PlayerCommand) => void;
}

export function PlayerControls({ status, onCommand }: PlayerControlsProps) {
    const navigationDisabled = !status.onReelsPage || status.navigating;
    const isPlaying = status.videoState === 'playing' || status.videoState === 'loading';
    const seekDisabled = !status.onReelsPage || status.videoState === 'none';

    return (
        <div className="flex items-center justify-center gap-2">
            <IconButton
                label="Back 10 seconds"
                variant="ghost"
                size="sm"
                rounded="full"
                disabled={seekDisabled}
                onClick={() => onCommand('seek-backward')}
            >
                <BackTenIcon className="size-6" />
            </IconButton>
            <IconButton
                label="Previous Reel"
                variant="outline"
                size="lg"
                rounded="full"
                disabled={navigationDisabled}
                onClick={() => onCommand('previous-reel')}
            >
                <PreviousIcon className="size-6" />
            </IconButton>
            <IconButton
                label={isPlaying ? 'Pause' : 'Play'}
                size="xl"
                rounded="full"
                disabled={!status.onReelsPage || status.videoState === 'none'}
                onClick={() => onCommand('toggle-play')}
            >
                {isPlaying ? <PauseIcon className="size-7" /> : <PlayIcon className="size-7" />}
            </IconButton>
            <IconButton
                label="Next Reel"
                variant="outline"
                size="lg"
                rounded="full"
                disabled={navigationDisabled}
                loading={status.navigating}
                onClick={() => onCommand('next-reel')}
            >
                <NextIcon className="size-6" />
            </IconButton>
            <IconButton
                label="Forward 10 seconds"
                variant="ghost"
                size="sm"
                rounded="full"
                disabled={seekDisabled}
                onClick={() => onCommand('seek-forward')}
            >
                <ForwardTenIcon className="size-6" />
            </IconButton>
        </div>
    );
}

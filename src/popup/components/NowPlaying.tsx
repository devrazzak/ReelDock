import { Badge, Spinner, Text } from '@rax-ds/ui';

import type { PlayerCommand } from '@/shared/messages';
import type { PlaybackStatus, VideoState } from '@/shared/status';

import { PlayerControls } from './PlayerControls';

const STATE_LABELS: Record<VideoState, string> = {
    none: 'No video',
    loading: 'Loading…',
    playing: 'Playing',
    paused: 'Paused',
    blocked: 'Blocked by Chrome',
};

interface NowPlayingProps {
    status: PlaybackStatus;
    onCommand: (command: PlayerCommand) => void;
}

export function NowPlaying({ status, onCommand }: NowPlayingProps) {
    const label = status.navigating ? 'Next video…' : STATE_LABELS[status.videoState];

    return (
        <section aria-label="Now playing" className="bg-muted flex flex-col gap-4 rounded-lg p-4">
            <div className="flex flex-col items-center gap-2 text-center">
                <Text size="xs" color="muted" textTransform="uppercase" tracking="wide">
                    Now playing
                </Text>
                <div className="flex items-center gap-2" role="status">
                    {(status.navigating || status.videoState === 'loading') && <Spinner size="sm" aria-hidden="true" />}
                    <Text as="span" size="lg" weight="semibold">
                        {label}
                    </Text>
                </div>
                <div className="flex min-h-5 flex-wrap justify-center gap-1.5">
                    {status.tabHidden && (
                        <Badge size="sm" variant="secondary">
                            In background
                        </Badge>
                    )}
                    {status.miniPlayerOpen && (
                        <Badge size="sm" variant="secondary">
                            Mini player
                        </Badge>
                    )}
                    {status.muted && (
                        <Badge size="sm" variant="outline">
                            Muted
                        </Badge>
                    )}
                </div>
            </div>
            <PlayerControls status={status} onCommand={onCommand} />
        </section>
    );
}

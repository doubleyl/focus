import { useEffect, useState, type CSSProperties } from 'react';
import type { MascotSkin } from '../../shared/types';
import { normalizeMascotImageSrc } from '../../shared/mascotSkins';

interface MascotVisualProps {
    skin: MascotSkin;
    alt?: string;
    className?: string;
    style?: CSSProperties;
    emojiClassName?: string;
    emojiStyle?: CSSProperties;
}

export default function MascotVisual({
    skin,
    alt,
    className,
    style,
    emojiClassName,
    emojiStyle,
}: MascotVisualProps) {
    const src = normalizeMascotImageSrc(skin.image);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [src]);

    if (src && !imageFailed) {
        return (
            <img
                src={src}
                alt={alt || skin.name}
                className={className}
                style={style}
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <span className={emojiClassName || className} style={emojiStyle || style}>
            {skin.emoji || '🐾'}
        </span>
    );
}

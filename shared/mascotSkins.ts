import { BUILT_IN_SKINS, type MascotSkin } from './types';

const LOCAL_IMAGE_HOST = 'local-file';

export function getAllMascotSkins(customSkins: MascotSkin[] = []): MascotSkin[] {
    return [...BUILT_IN_SKINS, ...customSkins];
}

export function getMascotSkin(skinId: string, customSkins: MascotSkin[] = []): MascotSkin {
    return getAllMascotSkins(customSkins).find((skin) => skin.id === skinId) || BUILT_IN_SKINS[0];
}

export function isBuiltInMascotSkin(skinId: string): boolean {
    return BUILT_IN_SKINS.some((skin) => skin.id === skinId);
}

export function normalizeMascotImageSrc(image?: string): string | undefined {
    if (!image) {
        return undefined;
    }

    if (image.startsWith('/')) {
        return `focus-local://${LOCAL_IMAGE_HOST}?path=${encodeURIComponent(image)}`;
    }

    if (image.startsWith('focus-local://')) {
        if (image.includes('?path=')) {
            return image;
        }

        const legacyPath = decodeURIComponent(image.slice('focus-local://'.length));
        return `focus-local://${LOCAL_IMAGE_HOST}?path=${encodeURIComponent(legacyPath)}`;
    }

    if (image.startsWith('file://')) {
        const filePath = decodeURIComponent(image.slice('file://'.length));
        return `focus-local://${LOCAL_IMAGE_HOST}?path=${encodeURIComponent(filePath)}`;
    }

    return image;
}

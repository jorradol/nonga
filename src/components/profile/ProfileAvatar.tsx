import { useEffect, useState } from "react";
import {
  resolveProfilePhotoFallbackUrl,
  resolveProfilePhotoURL,
  type ProfilePhotoUserLike,
} from "../../utils/profilePhotoUrl";

type ProfileAvatarProps = {
  user: ProfilePhotoUserLike | null | undefined;
  alt?: string;
  className?: string;
  /**
   * When provided, skip the generated (dicebear) fallback and notify the parent
   * instead — used by Chat sidebar to show a person icon. Header omits this
   * so existing generated-fallback behavior is unchanged.
   */
  onUnresolved?: () => void;
};

export default function ProfileAvatar({
  user,
  alt = "Avatar",
  className,
  onUnresolved,
}: ProfileAvatarProps) {
  const fallbackUrl = resolveProfilePhotoFallbackUrl(user);
  const [src, setSrc] = useState(() => resolveProfilePhotoURL(user));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setSrc(resolveProfilePhotoURL(user));
    setHidden(false);
  }, [user?.photoURL, user?.uid, user?.displayName, user?.email]);

  if (hidden) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (onUnresolved) {
          setHidden(true);
          onUnresolved();
          return;
        }
        setSrc((current) => (current === fallbackUrl ? current : fallbackUrl));
      }}
    />
  );
}

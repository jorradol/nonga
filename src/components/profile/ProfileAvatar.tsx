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
};

export default function ProfileAvatar({
  user,
  alt = "Avatar",
  className,
}: ProfileAvatarProps) {
  const fallbackUrl = resolveProfilePhotoFallbackUrl(user);
  const [src, setSrc] = useState(() => resolveProfilePhotoURL(user));

  useEffect(() => {
    setSrc(resolveProfilePhotoURL(user));
  }, [user?.photoURL, user?.uid, user?.displayName, user?.email]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        setSrc((current) => (current === fallbackUrl ? current : fallbackUrl));
      }}
    />
  );
}

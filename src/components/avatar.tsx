import Image from "next/image";

function initialOf(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

export function Avatar({
  name,
  email,
  image,
  size = 32,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? email ?? "avatar"}
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-medium text-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initialOf(name ?? null, email ?? null)}
    </div>
  );
}

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {size > 40 ? <img src="/logo_128.png" alt="" /> : <img src="/logo_32.png" alt="" />}
    </div>
  );
}


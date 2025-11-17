interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 32, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background circle */}
        <circle cx="20" cy="20" r="18" fill="#3B82F6"/>
        
        {/* Stylized horse silhouette */}
        <path 
          d="M12 28C12 26 13 24 14 23C14.5 22.5 15 22 15.5 21.5C16 21 16.5 20.5 17 20C17.5 19.5 18 19 18.5 18.5C19 18 19.5 17.5 20 17C20.5 17.5 21 18 21.5 18.5C22 19 22.5 19.5 23 20C23.5 20.5 24 21 24.5 21.5C25 22 25.5 22.5 26 23C27 24 28 26 28 28" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          fill="none"
        />
        
        {/* Horse head */}
        <ellipse cx="20" cy="15" rx="3" ry="4" fill="white"/>
        <circle cx="19" cy="14" r="1" fill="#3B82F6"/>
        <circle cx="21" cy="14" r="1" fill="#3B82F6"/>
        
        {/* Formation pattern dots (representing drill patterns) */}
        <circle cx="15" cy="12" r="1.5" fill="white" opacity="0.8"/>
        <circle cx="25" cy="12" r="1.5" fill="white" opacity="0.8"/>
        <circle cx="20" cy="10" r="1.5" fill="white" opacity="0.8"/>
      </svg>
      {(showText || size > 60) && (
        <span className={`text-lg font-bold text-gray-900 dark:text-gray-100 ${size > 60 ? 'text-2xl' : ''}`}>
          Horse Show Editor
        </span>
      )}
    </div>
  );
}


import "./CustomSpinner.css";

interface CustomSpinnerProps {
  size?: "sm" | "md" | "lg";
}

export default function CustomSpinner({ size = "md" }: CustomSpinnerProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-20 h-20",
    lg: "w-24 h-24"
  };

  return (
    <div className={`spinner ${sizeClasses[size]}`}>
      <div className={`spinner1 ${sizeClasses[size]}`}></div>
    </div>
  );
}

import React from 'react'

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

// Chrome on Windows uses OS locale for date input format, ignoring HTML lang.
// Setting lang="es-CL" on the input element itself forces dd/mm/yyyy display.
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, ...props }, ref) => (
    <input
      type="date"
      lang="es-CL"
      ref={ref}
      className={className}
      {...props}
    />
  )
)
DateInput.displayName = 'DateInput'

export default DateInput

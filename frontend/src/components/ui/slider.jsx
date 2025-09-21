import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/utils/ui"

const Slider = React.forwardRef(({ className, ...props }, ref) => {
    const { value } = props;
    const isRange = Array.isArray(value) && value.length > 1;

    return (
        <SliderPrimitive.Root
            ref={ref}
            className={cn(
                "relative flex w-full touch-none select-none items-center py-2",
                className
            )}
            {...props}
        >
            <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted border border-border">
                <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-primary/80 rounded-full" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:shadow-lg hover:scale-110 disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
            {isRange && (
                <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-md ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:shadow-lg hover:scale-110 disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
            )}
        </SliderPrimitive.Root>
    );
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }

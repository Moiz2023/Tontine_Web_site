import { Toaster as Sonner, toast } from "sonner"

// FIX: removed `import { useTheme } from "next-themes"` — next-themes is a
// Next.js package and will cause an error or require an unneeded dependency
// in a CRA / Vite React app. We detect dark mode directly from the browser
// using matchMedia, which is reliable and has no extra dependencies.

function useAppTheme() {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  return prefersDark ? "dark" : "light"
}

const Toaster = ({ ...props }) => {
  const theme = useAppTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props} />
  )
}

export { Toaster, toast }

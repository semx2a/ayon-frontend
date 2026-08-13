import { useMemo } from "react"
import { useFeedContext } from "../context/FeedContext"

// stands in for a category whose colour is missing, so it has to follow the theme
const FALLBACK_COLOR = 'var(--md-sys-color-outline)'

export function useCategoryData(category?: string) {
  const { categories } = useFeedContext()

  const { categoryData, categoryNotFound } = useMemo(() => {
    let categoryNotFound = false
    if (category) {
      const foundCategory = categories.find((cat) => cat.name === category)
      if (!foundCategory) {
        categoryNotFound = true
      }
      return {
        categoryData: foundCategory || {
          name: category,
          color: FALLBACK_COLOR,
        },
        categoryNotFound,
      }
    } else {
      return {
        categoryData: null,
        categoryNotFound,
      }
    }
  }, [category, categories])

  return { categoryData, categoryNotFound }
}

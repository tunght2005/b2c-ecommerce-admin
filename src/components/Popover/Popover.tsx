import { useState, useId, type ElementType, type ReactNode } from 'react'
import {
  useFloating,
  FloatingPortal,
  arrow,
  shift,
  offset,
  type Placement,
  flip,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  safePolygon
} from '@floating-ui/react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  children: ReactNode | ((state: { open: boolean }) => ReactNode)
  renderPopover: ReactNode
  className?: string
  as?: ElementType
  initialOpen?: boolean
  placement?: Placement
}

export default function Popover({
  children,
  className,
  renderPopover,
  as: Element = 'div',
  initialOpen,
  placement = 'bottom-end'
}: Props) {
  const [open, setOpen] = useState(initialOpen || false)
  const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null)
  const data = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), flip(), shift(), arrow({ element: arrowElement })],
    whileElementsMounted: autoUpdate,
    transform: false,
    placement
  })
  const { refs, floatingStyles, context } = data
  const hover = useHover(context, { handleClose: safePolygon() })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])
  const id = useId()
  return (
    <Element className={className} ref={(node) => refs.setReference(node)} {...getReferenceProps()}>
      {typeof children === 'function' ? children({ open }) : children}
      <FloatingPortal id={id}>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={(node) => refs.setFloating(node)}
              style={{
                transformOrigin: `${data.middlewareData.arrow?.x}px top`,
                ...floatingStyles
              }}
              {...getFloatingProps()}
              initial={{ opacity: 0, transform: `scale(0)` }}
              animate={{ opacity: 1, transform: `scale(1)` }}
              exit={{ opacity: 0, transform: `scale(0)` }}
              transition={{ duration: 0.2 }}
            >
              <span
                ref={setArrowElement}
                className='absolute z-10 translate-y-[-95%] border-[11px] border-x-transparent border-t-transparent border-b-white'
                style={{
                  left: data.middlewareData.arrow?.x,
                  top: data.middlewareData.arrow?.y
                }}
              />
              {renderPopover}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </Element>
  )
}

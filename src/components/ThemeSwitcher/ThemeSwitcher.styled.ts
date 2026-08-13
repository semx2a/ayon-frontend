import styled from 'styled-components'

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--base-gap-large);
  padding: 6px 12px;
`

export const Label = styled.span`
  color: var(--md-sys-color-on-surface-variant);
  white-space: nowrap;
`

export const Options = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--base-input-border-radius);
  background-color: var(--md-sys-color-surface-container-low);
`

export const Option = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  padding: 0;
  border: none;
  cursor: pointer;
  border-radius: calc(var(--base-input-border-radius) - 1px);
  background-color: transparent;
  color: var(--md-sys-color-on-surface-variant);

  &:hover {
    background-color: var(--md-sys-color-surface-container-hover);
  }

  &[aria-checked='true'] {
    background-color: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface);
  }

  &:focus-visible {
    outline: 1px solid var(--md-sys-color-primary);
    outline-offset: 1px;
  }

  .icon {
    font-size: 18px;
  }
`

/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import 奇穴设置 from './奇穴设置'
import { 获取洗髓固定奇穴 } from './奇穴'
jest.mock('./奇穴设置.css', () => ({}))
jest.mock('antd', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
  Drawer: ({ children, title, open }) =>
    open ? (
      <div>
        <h1>{title}</h1>
        {children}
      </div>
    ) : null,
  Tooltip: ({ children }) => <>{children}</>,
}))

test('只读设置仅展示六个常规、三个混池及各自图标，没有其他选择或清空入口', () => {
  render(<奇穴设置 />)
  fireEvent.click(screen.getByRole('button', { name: '奇穴设置', exact: true }))
  expect(screen.getByRole('heading', { name: '奇穴设置（已锁定）' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '常规奇穴' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '混池' })).toBeInTheDocument()
  expect(
    screen.getAllByRole('img').filter((项) => 项.tagName.toLowerCase() === 'img'),
  ).toHaveLength(9)
  for (const name of 获取洗髓固定奇穴())
    expect(screen.getByRole('img', { name, exact: true })).toHaveAttribute(
      'src',
      expect.stringMatching(/icon\/\d+\.png$/),
    )
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '清空奇穴' })).not.toBeInTheDocument()
  expect(screen.queryByText('未选择')).not.toBeInTheDocument()
})

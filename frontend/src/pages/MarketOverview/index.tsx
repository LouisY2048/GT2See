import { useState, useEffect, useMemo } from 'react'
import { Card, Table, Statistic, Row, Col, Space, Input, message, Spin, Badge, Tag, Tooltip, Pagination } from 'antd'
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  SearchOutlined, 
  RocketOutlined,
  DollarOutlined,
  ShoppingOutlined,
  FireOutlined 
} from '@ant-design/icons'
import { exchangeApi } from '../../services/api'
import type { MaterialPrice } from '../../types'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { formatPrice } from '../../utils/format'

type MaterialPriceWithDiff = MaterialPrice & {
  priceDiffValue?: number | null
  priceDiffPercent?: number | null
}

type SortOrder = 'ascend' | 'descend' | null

const MarketOverview = () => {
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<MaterialPriceWithDiff[]>([])
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 })
  const [sorterInfo, setSorterInfo] = useState<{ columnKey: string | null; order: SortOrder }>({
    columnKey: null,
    order: null,
  })

  // 获取数据
  const fetchData = async () => {
    setLoading(true)
    try {
      const pricesRes = await exchangeApi.getMaterialPrices()

      // 处理价格数据 - 根据API文档，全材料价格返回 {prices: [...]}
      let pricesData: MaterialPrice[] = []
      if ((pricesRes as any).prices) {
        pricesData = (pricesRes as any).prices
      } else if (Array.isArray(pricesRes)) {
        pricesData = pricesRes
      }

      const pricesWithDiff: MaterialPriceWithDiff[] = pricesData.map(price => {
        const hasValidPrice = price.currentPrice > 0 && price.avgPrice > 0
        const diffValue = hasValidPrice ? price.currentPrice - price.avgPrice : null
        const diffPercent = hasValidPrice && price.avgPrice !== 0
          ? diffValue! / price.avgPrice
          : null

        return {
          ...price,
          priceDiffValue: diffValue,
          priceDiffPercent: diffPercent,
        }
      })

      setPrices(pricesWithDiff)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // 设置定时刷新（每60秒）
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const filteredPrices = useMemo(() => {
    if (!searchText) {
      return prices
    }
    const lowerSearch = searchText.toLowerCase()
    return prices.filter(item =>
      item.matName?.toLowerCase().includes(lowerSearch)
    )
  }, [prices, searchText])

  const getSortValue = (record: MaterialPriceWithDiff, columnKey: string | null): number | null => {
    if (!columnKey) return null
    switch (columnKey) {
      case 'currentPrice':
        return record.currentPrice > 0 ? record.currentPrice : null
      case 'avgPrice':
        return record.avgPrice > 0 ? record.avgPrice : null
      case 'priceDiff':
        return record.priceDiffPercent !== null && record.priceDiffPercent !== undefined
          ? record.priceDiffPercent
          : null
      default:
        return null
    }
  }

  const sortedPrices = useMemo(() => {
    if (!sorterInfo.columnKey || !sorterInfo.order) {
      return filteredPrices
    }
    const sorted = [...filteredPrices]
    sorted.sort((a, b) => {
      const aVal = getSortValue(a, sorterInfo.columnKey)
      const bVal = getSortValue(b, sorterInfo.columnKey)

      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      const isAscend = sorterInfo.order === 'ascend'

      return isAscend
        ? bVal - aVal
        : aVal - bVal
    })
    return sorted
  }, [filteredPrices, sorterInfo])

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }, [searchText, sorterInfo])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(sortedPrices.length / pagination.pageSize) || 1)
    if (pagination.current > maxPage) {
      setPagination(prev => ({ ...prev, current: maxPage }))
    }
  }, [sortedPrices.length, pagination.current, pagination.pageSize])

  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedPrices.slice(start, end)
  }, [sortedPrices, pagination])

  const handlePaginationChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      current: page,
      pageSize: pageSize || prev.pageSize,
    }))
  }

  const handlePageSizeChange = (_current: number, size: number) => {
    setPagination({ current: 1, pageSize: size })
  }

  const validSortableColumns = new Set(['currentPrice', 'avgPrice', 'priceDiff'])

  const handleTableChange: TableProps<MaterialPriceWithDiff>['onChange'] = (
    _pagination,
    _filters,
    sorter
  ) => {
    let columnKey: string | null = null
    let order: SortOrder = null

    if (Array.isArray(sorter)) {
      const firstSorter = sorter.find(item => item.order)
      if (firstSorter) {
        columnKey = (firstSorter.columnKey ?? firstSorter.field ?? null) as string | null
        order = (firstSorter.order as SortOrder) ?? null
      }
    } else if (sorter) {
      columnKey = (sorter.columnKey ?? sorter.field ?? null) as string | null
      order = (sorter.order as SortOrder) ?? null
    }

    if (!columnKey || !validSortableColumns.has(columnKey)) {
      columnKey = null
      order = null
    }

    setSorterInfo({ columnKey, order })
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 计算统计数据
  const stats = {
    totalMaterials: prices.length,
    availableMaterials: prices.filter(p => p.currentPrice > 0).length,
    avgPrice: prices.length > 0 
      ? prices.filter(p => p.currentPrice > 0).reduce((sum, p) => sum + p.currentPrice, 0) / prices.filter(p => p.currentPrice > 0).length 
      : 0,
    maxPrice: prices.length > 0 
      ? Math.max(...prices.map(p => p.currentPrice > 0 ? p.currentPrice : 0)) 
      : 0,
  }

  // 表格列定义
  const columns: ColumnsType<MaterialPriceWithDiff> = [
    {
      title: '材料名称',
      dataIndex: 'matName',
      key: 'matName',
      fixed: 'left' as const,
      width: 200,
      render: (name: string, record: MaterialPriceWithDiff) => (
        <Space>
          <Badge status={record.currentPrice > 0 ? 'success' : 'default'} />
          <strong>{name}</strong>
        </Space>
      ),
    },
    {
      title: '当前价格',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      width: 150,
      sorter: () => 0,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sorterInfo.columnKey === 'currentPrice' ? sorterInfo.order : null,
      render: (price: number) => (
        <Tooltip title={price === -1 ? '无可用订单' : `${price} 分 (cents)`}>
          <span style={{ 
            color: price > 0 ? '#1890ff' : '#999', 
            fontWeight: 'bold',
            fontSize: '16px' 
          }}>
            {formatPrice(price)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '平均价格',
      dataIndex: 'avgPrice',
      key: 'avgPrice',
      width: 150,
      sorter: () => 0,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sorterInfo.columnKey === 'avgPrice' ? sorterInfo.order : null,
      render: (price: number) => (
        <Tooltip title={price === -1 ? '无历史数据' : `${price} 分 (cents)`}>
          <span style={{ color: price > 0 ? '#52c41a' : '#999' }}>
            {formatPrice(price)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '价差*',
      key: 'priceDiff',
      width: 130,
      sorter: () => 0,
      sortDirections: ['descend', 'ascend'],
      sortOrder: sorterInfo.columnKey === 'priceDiff' ? sorterInfo.order : null,
      render: (_: any, record: MaterialPriceWithDiff) => {
        if (record.priceDiffPercent === null || record.priceDiffPercent === undefined) return '-'
        const diffPercent = record.priceDiffPercent * 100
        const diff = record.priceDiffValue ?? 0
        const isPositive = diff > 0
        
        return (
          <Tooltip title={`${isPositive ? '+' : ''}${formatPrice(diff)}`}>
            <Tag color={isPositive ? 'red' : 'green'} style={{ fontWeight: 'bold' }}>
              {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {Math.abs(diffPercent).toFixed(1)}%
            </Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: MaterialPriceWithDiff) => {
        if (record.currentPrice === -1) {
          return <Tag color="default">无订单</Tag>
        }
        if (record.avgPrice === -1) {
          return <Tag color="blue">新上市</Tag>
        }
        const diff = record.currentPrice - record.avgPrice
        if (diff > record.avgPrice * 0.2) {
          return <Tag color="red" icon={<FireOutlined />}>高价</Tag>
        }
        if (diff < -record.avgPrice * 0.2) {
          return <Tag color="green" icon={<RocketOutlined />}>低价</Tag>
        }
        return <Tag color="default">正常</Tag>
      },
    },
  ]

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          市场概览
        </h1>
        <p style={{ color: '#8c8c8c', fontSize: '16px' }}>
          实时材料价格监控 · 数据每5分钟自动更新
        </p>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} className="slide-in-left">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>材料总数</span>}
              value={stats.totalMaterials}
              suffix="种"
              prefix={<ShoppingOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>可交易材料</span>}
              value={stats.availableMaterials}
              suffix="种"
              prefix={<RocketOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>平均价格</span>}
              value={stats.avgPrice / 100}
              precision={2}
              prefix={<DollarOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title={<span style={{ fontSize: '16px', color: '#8c8c8c' }}>最高价格</span>}
              value={stats.maxPrice / 100}
              precision={2}
              prefix={<FireOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和排序 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <Space size="large" wrap>
              <Input
                placeholder="搜索材料名称"
                prefix={<SearchOutlined style={{ color: '#1890ff' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
            </Space>
          </Col>
          <Col>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={sortedPrices.length}
              showSizeChanger
              pageSizeOptions={['10', '20', '50', '100']}
              showTotal={(total) => `共 ${total} 种材料`}
              onChange={handlePaginationChange}
              onShowSizeChange={handlePageSizeChange}
            />
          </Col>
        </Row>
      </Card>

      {/* 材料价格表格 */}
      <Card className="data-table">
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={paginatedData}
            rowKey="matId"
            pagination={false}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
            rowClassName={(record) => 
              record.currentPrice === -1 ? 'row-disabled' : ''
            }
          />
        </Spin>
        <div style={{ marginTop: 12, color: '#8c8c8c' }}>
          价差* 计算方式：((当前价格 - 平均价格) / 平均价格) × 100%，反映当前价格相对平均价格的涨跌幅；若缺少历史平均价格则不显示。
        </div>
      </Card>
    </div>
  )
}

export default MarketOverview

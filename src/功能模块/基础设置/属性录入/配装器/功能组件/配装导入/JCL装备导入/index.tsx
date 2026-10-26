import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'
import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Spin, Upload, message } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import styles from './index.module.less'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取明尊装备条目 } from '@/数据/数据工具/明尊数据适配'
import { 装备位置部位枚举, 装备属性信息模型, 选择装备数据类型 } from '@/@types/装备'
import { 获取最大精炼等级 } from '../../../工具函数/获取最大精炼等级'
const { Dragger } = Upload
const { 装备数据, 附魔, 名称 } = 获取当前数据()

function JCL装备导入({ onOk }) {
  const [loading, setLoading] = useState<boolean>(false)
  const workerRef = useRef<Worker | null>(null)
  const [解析结果, 更新解析结果] = useState<{
    最终装备对象: { [key: string]: 选择装备数据类型 }
    未支持附魔: string[]
    未支持装备: number[]
    支持的装备: 装备属性信息模型[]
  }>()

  const beforeOnOk = () => {
    if (解析结果 && Object.keys(解析结果?.最终装备对象)?.length) {
      onOk({
        大附魔_伤帽: undefined,
        大附魔_伤衣: undefined,
        大附魔_伤腰: undefined,
        大附魔_伤腕: undefined,
        大附魔_伤鞋: undefined,
        ...解析结果?.最终装备对象,
        五彩石: undefined,
      })
    } else {
      message.error('无成功解析数据')
    }
  }

  useEffect(() => {
    // 创建 Worker 实例
    workerRef.current = new Worker(new URL('./worker.ts', import.meta.url))

    // 定义接收 Worker 消息的回调
    workerRef.current.onmessage = (event) => {
      console.log('event', event)
      if (event.data && Object.keys(event.data)?.length) {
        message.success('解析成功，请确认无误后点击导入')
        初始化装备数据(event.data)
      } else {
        更新解析结果(undefined)
        message.error('该心法不支持或解析失败')
      }
      setLoading(false)
    }

    // 清理 Worker
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const 初始化装备数据 = (data) => {
    const 最终装备对象: { [key: string]: 选择装备数据类型 } = {}
    const 未支持附魔: string[] = []
    const 未支持装备: number[] = []
    const 支持的装备: 装备属性信息模型[] = []
    Object.keys(data).forEach((部位索引) => {
      const 数据 = data[部位索引]
      if (部位索引?.includes('大附魔')) {
        最终装备对象[部位索引] = 数据
        return
      }
      const 装备部位 = 装备位置部位枚举[部位索引]
      const 找到对应装备 = 使用五十级装备(名称)
        ? 获取明尊装备条目(装备部位, 数据?.id)
        : 装备数据[装备部位]?.find((item) => item?.id === 数据?.id)
      if (找到对应装备) {
        支持的装备.push({ ...找到对应装备, 装备部位 })
        let 附魔名称 = undefined
        if (数据?.附魔) {
          const 判断附魔是否存在 = 附魔?.find((a) => a?.附魔名称 === 数据?.附魔)
          if (判断附魔是否存在) {
            附魔名称 = 数据?.附魔
          } else {
            未支持附魔.push(数据?.附魔)
          }
        }
        const 最大精炼等级 = 获取最大精炼等级(找到对应装备)
        最终装备对象[部位索引] = {
          id: 找到对应装备.id,
          当前精炼等级: 最大精炼等级,
          镶嵌孔数组:
            找到对应装备?.镶嵌孔数组?.map((item) => {
              return {
                ...item,
                镶嵌宝石等级: 8,
              }
            }) || [],
          装备部位,
          附魔: 附魔名称,
        }
      } else {
        if (数据?.id) {
          未支持装备.push(数据?.id)
        }
        最终装备对象[部位索引] = {
          id: undefined,
          当前精炼等级: 6,
          镶嵌孔数组: [],
          装备部位,
          附魔: '',
        }
      }
    })
    更新解析结果({
      最终装备对象,
      未支持附魔,
      未支持装备,
      支持的装备,
    })
  }

  const handleFileChange = (e) => {
    const file = e
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => {
      if (reader.result) {
        setLoading(true)
        if (workerRef.current) {
          workerRef.current.postMessage(reader.result)
        }
      }
    }
  }

  return (
    <Spin spinning={loading} tip='解析中'>
      <div>
        <Alert
          type='warning'
          style={{ marginBottom: 12 }}
          message={'暂不支持解析镶嵌、大附魔、五彩石。默认按满精炼，镶8导入，有需要请手动调整'}
        />
        <Dragger
          name='file'
          fileList={[]}
          beforeUpload={(file) => {
            handleFileChange(file)
          }}
          className={styles.dragger}
        >
          <p className={styles.dragIconWrap}>
            <InboxOutlined className={styles.dragIcon} />
          </p>
          <p className={styles.dragText}>点击上传JCL文件</p>
        </Dragger>
        {解析结果 ? (
          <div className={styles.res}>
            {解析结果?.支持的装备?.length ? (
              <>
                <Button block type='primary' onClick={beforeOnOk} style={{ marginBottom: 12 }}>
                  导入
                </Button>
                <div className={styles.title}>成功识别 {解析结果?.支持的装备?.length} 件装备</div>
                <div className={styles.contentText}>
                  {解析结果?.支持的装备
                    ?.map((装备) => {
                      return 装备?.装备名称
                    })
                    ?.join('、')}
                </div>
              </>
            ) : null}

            {解析结果?.未支持装备?.length ? (
              <>
                <div className={styles.title}>未识别装备ID</div>
                <div className={styles.contentText}>{解析结果?.未支持装备?.join('、')}</div>
              </>
            ) : null}
            {解析结果?.未支持附魔?.length ? (
              <>
                <div className={styles.title}>未识别附魔</div>
                <div className={styles.contentText}>{解析结果?.未支持附魔?.join('、')}</div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Spin>
  )
}

export default JCL装备导入

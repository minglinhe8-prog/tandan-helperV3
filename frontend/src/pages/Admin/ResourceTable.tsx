import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Modal, Form, message, Popconfirm } from 'antd';
import { SearchOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { getAllResources, deleteResource, updateResource, bulkDeleteResources } from '../../api/admin';
import { Resource } from '../../types';

const { Option } = Select;

const ResourceTable: React.FC = () => {
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [filters, setFilters] = useState({ category: '', grade: '', keyword: '' });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.category) params.category = filters.category;
      if (filters.grade) params.grade = filters.grade;
      if (filters.keyword) params.keyword = filters.keyword;
      const res = await getAllResources(params);
      setData(res);
    } catch {
      message.error('加载资源失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleDelete = async (id: number) => {
    try {
      await deleteResource(id);
      message.success('删除成功');
      loadData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的资源');
      return;
    }
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个资源吗？`,
      onOk: async () => {
        try {
          await bulkDeleteResources(selectedRowKeys as number[]);
          message.success(`成功删除 ${selectedRowKeys.length} 个资源`);
          setSelectedRowKeys([]);
          loadData();
        } catch {
          message.error('批量删除失败');
        }
      },
    });
  };

  const handleEdit = (record: Resource) => {
    setEditingResource(record);
    form.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingResource) {
        await updateResource(editingResource.id, values);
        message.success('更新成功');
        setEditModalVisible(false);
        loadData();
      }
    } catch {
      message.error('更新失败');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100 },
    { title: '年级', dataIndex: 'grade', key: 'grade', width: 80, render: (v: string) => v || '-' },
    { title: '科目', dataIndex: 'subject', key: 'subject', width: 80, render: (v: string) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Resource) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => setSelectedRowKeys(newSelectedRowKeys),
  };

  return (
    <div>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="搜索文件名..."
          prefix={<SearchOutlined />}
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="分类"
          value={filters.category || undefined}
          onChange={(val) => setFilters({ ...filters, category: val || '' })}
          style={{ width: 120 }}
          allowClear
        >
          <Option value="课表">课表</Option>
          <Option value="课程大纲">课程大纲</Option>
          <Option value="老师介绍">老师介绍</Option>
          <Option value="政策">政策</Option>
          <Option value="优惠价格">优惠价格</Option>
        </Select>
        <Select
          placeholder="年级"
          value={filters.grade || undefined}
          onChange={(val) => setFilters({ ...filters, grade: val || '' })}
          style={{ width: 100 }}
          allowClear
        >
          <Option value="初一">初一</Option>
          <Option value="初二">初二</Option>
          <Option value="初三">初三</Option>
        </Select>

        {selectedRowKeys.length > 0 && (
          <Button danger icon={<DeleteOutlined />} onClick={handleBulkDelete}>
            批量删除 ({selectedRowKeys.length})
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        rowSelection={rowSelection}
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
      />

      <Modal
        title="编辑资源"
        open={editModalVisible}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalVisible(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="名称" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="分类" name="category">
            <Select>
              <Option value="课表">课表</Option>
              <Option value="课程大纲">课程大纲</Option>
              <Option value="老师介绍">老师介绍</Option>
              <Option value="政策">政策</Option>
              <Option value="优惠价格">优惠价格</Option>
            </Select>
          </Form.Item>
          <Form.Item label="年级" name="grade">
            <Select allowClear>
              <Option value="初一">初一</Option>
              <Option value="初二">初二</Option>
              <Option value="初三">初三</Option>
            </Select>
          </Form.Item>
          <Form.Item label="科目" name="subject">
            <Select allowClear>
              <Option value="博文">博文</Option>
              <Option value="双语">双语</Option>
              <Option value="托管">托管</Option>
              <Option value="实验P">实验P</Option>
              <Option value="实验C">实验C</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ResourceTable;

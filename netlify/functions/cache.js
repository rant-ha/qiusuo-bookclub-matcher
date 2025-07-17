const { getStore } = require('@netlify/blobs');

// 处理不同HTTP方法的函数声明
const handleGet = async (event, adminId) => {
  try {
    const { key } = event.queryStringParameters || {};
    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cache key is required' })
      };
    }

    const store = await getStore('ai-cache');
    const data = await store.get(key);
    
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Cache not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error reading cache:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to read cache' })
    };
  }
};

const handlePost = async (event, adminId) => {
  try {
    const { key, value } = JSON.parse(event.body);
    if (!key || !value) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Both key and value are required' })
      };
    }

    // 添加元数据
    const enrichedValue = {
      ...value,
      createdAt: new Date().toISOString(),
      createdBy: adminId
    };

    const store = await getStore('ai-cache');
    await store.set(key, enrichedValue);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cache updated successfully' })
    };
  } catch (error) {
    console.error('Error writing cache:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to write cache' })
    };
  }
};

const handleDelete = async (event, adminId) => {
  try {
    const { key } = JSON.parse(event.body);
    if (!key) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cache key is required' })
      };
    }

    const store = await getStore('ai-cache');
    await store.delete(key);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Cache deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting cache:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete cache' })
    };
  }
};

// 主处理函数
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // 验证认证令牌
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No authorization token provided' })
      };
    }

    // TODO: 在第二阶段实现完整的令牌验证
    const adminId = 'temp-admin-id'; // 临时占位，将在后续实现中替换

    // 根据HTTP方法分发到对应的处理函数
    switch (event.httpMethod) {
      case 'GET':
        return { ...await handleGet(event, adminId), headers };
      case 'POST':
        return { ...await handlePost(event, adminId), headers };
      case 'DELETE':
        return { ...await handleDelete(event, adminId), headers };
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Cache API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
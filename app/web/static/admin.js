// Admin panel JavaScript

// API base URL
const API_BASE = '';

// API Key management
function getApiKey() {
    return localStorage.getItem('admin_api_key');
}

function setApiKey(key) {
    localStorage.setItem('admin_api_key', key);
}

function clearApiKey() {
    if (confirm('确定要清除 API 密钥吗？')) {
        localStorage.removeItem('admin_api_key');
        promptForApiKey();
    }
}

function promptForApiKey() {
    // 重定向到登录页面
    window.location.href = '/admin/login';
}

// Make authenticated request
async function fetchWithAuth(url, options = {}) {
    const apiKey = getApiKey();
    if (!apiKey) {
        // 重定向到登录页面
        window.location.href = '/admin/login';
        throw new Error('No API key');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${apiKey}`
    };
    
    const response = await fetch(url, { ...options, headers });
    
    // Handle auth errors
    if (response.status === 401 || response.status === 403) {
        clearApiKey();
        // 重定向到登录页面
        window.location.href = '/admin/login';
        throw new Error('Authentication failed');
    }
    
    return response;
}

// Handle authentication errors
function handleAuthError(error) {
    if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
        clearApiKey();
        return true;
    }
    return false;
}

// Show/hide sections
function showSection(section, trigger = null) {
    document.querySelectorAll('.section').forEach(el => {
        el.style.display = 'none';
    });

    document.querySelectorAll('.nav-link').forEach(el => {
        el.classList.remove('active');
    });

    document.getElementById(`${section}-section`).style.display = 'block';
    if (trigger) {
        trigger.classList.add('active');
    } else {
        const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
        if (activeLink) activeLink.classList.add('active');
    }

    if (section === 'dashboard') {
        loadDashboard();
    } else if (section === 'accounts') {
        loadAccounts();
    } else if (section === 'apikeys') {
        loadApiKeys();
    }
}

// Chart instance
let tokensChart = null;

// Format number with commas
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Format large numbers (K, M, B)
function formatLargeNumber(num) {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toString();
}

// Load dashboard stats
async function loadDashboard() {
    try {
        const [accountStats, keyStats, tokensStats, accountUsageStats] = await Promise.all([
            fetchWithAuth(`${API_BASE}/admin/stats/accounts`).then(r => r.json()),
            fetchWithAuth(`${API_BASE}/admin/stats/api-keys`).then(r => r.json()),
            fetchWithAuth(`${API_BASE}/admin/stats/tokens?days=7`).then(r => r.json()),
            fetchWithAuth(`${API_BASE}/admin/stats/account-usage?days=7`).then(r => r.json())
        ]);
        
        // Update basic stats
        document.getElementById('total-accounts').textContent = accountStats.total_accounts;
        document.getElementById('active-accounts').textContent = accountStats.active_accounts;
        document.getElementById('total-keys').textContent = keyStats.total_keys;
        document.getElementById('total-requests').textContent = formatNumber(accountStats.total_requests);
        
        // Update tokens stats
        const totalInputTokens = tokensStats.total.input_tokens || 0;
        const totalOutputTokens = tokensStats.total.output_tokens || 0;
        const totalTokens = tokensStats.total.total_tokens || 0;
        
        document.getElementById('total-input-tokens').innerHTML = formatLargeNumber(totalInputTokens) + '<span class="unit">tokens</span>';
        document.getElementById('total-output-tokens').innerHTML = formatLargeNumber(totalOutputTokens) + '<span class="unit">tokens</span>';
        document.getElementById('total-tokens').innerHTML = formatLargeNumber(totalTokens) + '<span class="unit">tokens</span>';
        
        // Update tokens chart
        updateTokensChart(tokensStats);
        
        // Update account usage table
        updateAccountUsageTable(accountUsageStats);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        if (!handleAuthError(error)) {
            alert('加载数据失败');
        }
    }
}

// Update tokens chart
function updateTokensChart(tokensStats) {
    const ctx = document.getElementById('tokens-chart');
    if (!ctx) return;
    
    const daily = tokensStats.daily || [];
    const labels = daily.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    });
    
    const inputTokensData = daily.map(d => d.input_tokens || 0);
    const outputTokensData = daily.map(d => d.output_tokens || 0);
    const totalTokensData = daily.map(d => d.total_tokens || 0);
    
    // Destroy existing chart if it exists
    if (tokensChart) {
        tokensChart.destroy();
    }
    
    tokensChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '输入 Tokens',
                    data: inputTokensData,
                    borderColor: '#5bc7c8',
                    backgroundColor: 'rgba(91, 199, 200, 0.14)',
                    tension: 0.34,
                    fill: true
                },
                {
                    label: '输出 Tokens',
                    data: outputTokensData,
                    borderColor: '#ef8baa',
                    backgroundColor: 'rgba(239, 139, 170, 0.14)',
                    tension: 0.34,
                    fill: true
                },
                {
                    label: '总 Tokens',
                    data: totalTokensData,
                    borderColor: '#7b68ee',
                    backgroundColor: 'rgba(123, 104, 238, 0.14)',
                    tension: 0.34,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 10,
                        color: '#6d6383',
                        padding: 18
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(45, 35, 64, 0.92)',
                    titleColor: '#ffffff',
                    bodyColor: '#f7f3ff',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatNumber(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9086a6'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(126, 106, 170, 0.12)'
                    },
                    ticks: {
                        color: '#9086a6',
                        callback: function(value) {
                            return formatLargeNumber(value);
                        }
                    }
                }
            }
        }
    });
}

// Update account usage table
function updateAccountUsageTable(accountUsageStats) {
    const container = document.getElementById('account-usage-table');
    if (!container) return;
    
    const accounts = accountUsageStats.accounts || [];
    
    if (accounts.length === 0) {
        container.innerHTML = '<div class="card empty-state">最近 7 天还没有账号使用数据。</div>';
        return;
    }
    
    const tableHtml = `
        <div class="data-table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>账号名称</th>
                        <th>状态</th>
                        <th>输入 Tokens</th>
                        <th>输出 Tokens</th>
                        <th>总 Tokens</th>
                        <th>请求数</th>
                        <th>累计请求</th>
                        <th>最后使用</th>
                    </tr>
                </thead>
                <tbody>
                    ${accounts.map(acc => `
                        <tr>
                            <td>
                                <span class="table-primary">${acc.account_name}</span>
                                <span class="table-meta">最近 7 天贡献明细</span>
                            </td>
                            <td>
                                <span class="status-badge ${acc.is_active ? 'status-active' : 'status-inactive'}">
                                    ${acc.is_active ? '活跃' : '停用'}
                                </span>
                                <span class="status-badge ${acc.is_healthy ? 'status-healthy' : 'status-inactive'}" style="margin-left: 0.5rem;">
                                    ${acc.is_healthy ? '健康' : '异常'}
                                </span>
                            </td>
                            <td><span class="token-badge">${formatNumber(acc.input_tokens)}</span></td>
                            <td><span class="token-badge">${formatNumber(acc.output_tokens)}</span></td>
                            <td><span class="table-primary">${formatNumber(acc.total_tokens)}</span></td>
                            <td>${formatNumber(acc.requests)}</td>
                            <td>${formatNumber(acc.total_requests_all_time)}</td>
                            <td>${acc.last_used ? new Date(acc.last_used).toLocaleString('zh-CN') : '从未使用'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHtml;
}

// Load accounts
async function loadAccounts() {
    try {
        const accounts = await fetchWithAuth(`${API_BASE}/admin/accounts`).then(r => r.json());
        if (!accounts.length) {
            document.getElementById('accounts-table').innerHTML = '<div class="empty-state">账号池还是空的，可以先上传 JSON 或手工添加一个账号。</div>';
            return;
        }
        const tableHtml = `
            <div class="data-table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>名称</th>
                            <th>状态</th>
                            <th>健康</th>
                            <th>请求数</th>
                            <th>Token 数</th>
                            <th>最后使用</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accounts.map(acc => `
                            <tr>
                                <td>
                                    <span class="table-primary">${acc.name}</span>
                                    <span class="table-meta">ID: ${acc.id}</span>
                                </td>
                                <td><span class="status-badge ${acc.is_active ? 'status-active' : 'status-inactive'}">
                                    ${acc.is_active ? '活跃' : '停用'}
                                </span></td>
                                <td><span class="status-badge ${acc.is_healthy ? 'status-healthy' : 'status-inactive'}">
                                    ${acc.is_healthy ? '健康' : '异常'}
                                </span></td>
                                <td>${formatNumber(acc.total_requests || 0)}</td>
                                <td>${formatNumber(acc.total_tokens || 0)}</td>
                                <td>${acc.last_used ? new Date(acc.last_used).toLocaleString('zh-CN') : '从未使用'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="btn btn-primary" type="button" onclick="refreshAccountToken(${acc.id})">刷新 Token</button>
                                        <button class="btn btn-secondary" type="button" onclick="viewAccountStats(${acc.id})">统计</button>
                                        <button class="btn btn-danger" type="button" onclick="deleteAccount(${acc.id})">删除</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('accounts-table').innerHTML = tableHtml;
    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// Load API keys
async function loadApiKeys() {
    try {
        const keys = await fetchWithAuth(`${API_BASE}/admin/api-keys`).then(r => r.json());
        if (!keys.length) {
            document.getElementById('keys-table').innerHTML = '<div class="empty-state">还没有 API 密钥，先创建一个新的访问凭证吧。</div>';
            return;
        }
        const tableHtml = `
            <div class="data-table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>名称</th>
                            <th>密钥</th>
                            <th>状态</th>
                            <th>请求数</th>
                            <th>最后使用</th>
                            <th>过期时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${keys.map(key => `
                            <tr>
                                <td>
                                    <span class="table-primary">${key.name}</span>
                                    <span class="table-meta">${key.is_admin ? '管理员密钥' : '普通密钥'}</span>
                                </td>
                                <td><span class="mono-chip"><code>${key.key}</code></span></td>
                                <td><span class="status-badge ${key.is_active ? 'status-active' : 'status-inactive'}">
                                    ${key.is_active ? '活跃' : '停用'}
                                </span></td>
                                <td>${formatNumber(key.total_requests || 0)}</td>
                                <td>${key.last_used ? new Date(key.last_used).toLocaleString('zh-CN') : '从未使用'}</td>
                                <td>${key.expires_at ? new Date(key.expires_at).toLocaleString('zh-CN') : '永久'}</td>
                                <td>
                                    <div class="table-actions">
                                        ${key.is_active ? `<button class="btn btn-secondary" type="button" onclick="revokeKey(${key.id})">吊销</button>` : ''}
                                        <button class="btn btn-danger" type="button" onclick="deleteKey(${key.id})">删除</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('keys-table').innerHTML = tableHtml;
    } catch (error) {
        console.error('Error loading API keys:', error);
    }
}

// Modal functions
function showAddAccountModal() {
    document.getElementById('add-account-modal').classList.add('show');
    document.getElementById('add-account-modal').setAttribute('aria-hidden', 'false');
}

function showAddKeyModal() {
    document.getElementById('add-key-modal').classList.add('show');
    document.getElementById('add-key-modal').setAttribute('aria-hidden', 'false');
}

function showUploadJsonModal() {
    document.getElementById('upload-json-form').reset();
    document.getElementById('upload-json-alert').innerHTML = '';
    document.getElementById('upload-json-modal').classList.add('show');
    document.getElementById('upload-json-modal').setAttribute('aria-hidden', 'false');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.getElementById(modalId).setAttribute('aria-hidden', 'true');
}

// Form submissions
document.getElementById('add-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Convert empty strings to null
    if (!data.profile_arn) data.profile_arn = null;
    if (!data.notes) data.notes = null;
    data.requests_per_minute = parseInt(data.requests_per_minute);
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/accounts`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('add-account-modal');
            e.target.reset();
            loadAccounts();
            alert('账号添加成功！');
        } else {
            const error = await response.json();
            alert('添加失败: ' + error.detail);
        }
    } catch (error) {
        alert('添加失败: ' + error.message);
    }
});

document.getElementById('add-key-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Convert empty strings to null
    if (!data.description) data.description = null;
    if (!data.expires_days) data.expires_days = null;
    else data.expires_days = parseInt(data.expires_days);
    
    data.requests_per_minute = parseInt(data.requests_per_minute);
    data.requests_per_day = parseInt(data.requests_per_day);
    data.is_admin = data.is_admin === 'true';  // Convert checkbox to boolean
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/api-keys`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            closeModal('add-key-modal');
            e.target.reset();
            loadApiKeys();
            alert('API密钥创建成功！\n密钥: ' + result.key + '\n\n请妥善保存，此密钥只显示一次！');
        } else {
            const error = await response.json();
            alert('创建失败: ' + error.detail);
        }
    } catch (error) {
        if (!handleAuthError(error)) {
            alert('创建失败: ' + error.message);
        }
    }
});

// Upload JSON form submission
document.getElementById('upload-json-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertDiv = document.getElementById('upload-json-alert');
    alertDiv.innerHTML = '<div class="alert alert-success">正在处理...</div>';
    
    const formData = new FormData(e.target);
    const fileInput = document.getElementById('upload-json-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alertDiv.innerHTML = '<div class="alert alert-error">请选择 JSON 文件</div>';
        return;
    }
    
    // 验证文件类型
    if (!file.name.endsWith('.json')) {
        alertDiv.innerHTML = '<div class="alert alert-error">请选择 JSON 文件</div>';
        return;
    }
    
    // 读取文件内容并添加到 FormData
    formData.append('json_file', file);
    
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
            window.location.href = '/admin/login';
            return;
        }
        
        const response = await fetch(`${API_BASE}/admin/accounts/upload-json`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });
        
        if (response.status === 401 || response.status === 403) {
            clearApiKey();
            window.location.href = '/admin/login';
            return;
        }
        
        const result = await response.json();
        
        if (response.ok) {
            const importedAccounts = Array.isArray(result.accounts) ? result.accounts : (result.account ? [result.account] : []);
            const failedRefreshes = Array.isArray(result.token_refresh?.results)
                ? result.token_refresh.results.filter(item => !item.success).length
                : (result.token_refresh?.success === false ? 1 : 0);

            alertDiv.innerHTML = '<div class="alert alert-success">账号添加成功，正在同步列表...</div>';
            closeModal('upload-json-modal');
            e.target.reset();
            loadAccounts();
            
            setTimeout(() => {
                if (importedAccounts.length <= 1) {
                    const account = importedAccounts[0];
                    const tokenMessage = failedRefreshes > 0 ? 'Token 刷新失败，请手动检查。' : 'Token 已自动刷新！';
                    alert(`账号添加成功！\n\n账号名称: ${account.name}\n账号ID: ${account.id}\n\n${tokenMessage}`);
                    return;
                }

                const tokenSummary = failedRefreshes > 0
                    ? `${failedRefreshes} 个账号 Token 刷新失败，请手动检查。`
                    : '全部 Token 已自动刷新！';
                alert(`批量导入成功！\n\n导入数量: ${importedAccounts.length}\n\n${tokenSummary}`);
            }, 500);
        } else {
            alertDiv.innerHTML = `<div class="alert alert-error">添加失败: ${result.detail || '未知错误'}</div>`;
        }
    } catch (error) {
        console.error('Upload error:', error);
        alertDiv.innerHTML = `<div class="alert alert-error">上传失败: ${error.message}</div>`;
    }
});

// Delete functions
async function deleteAccount(id) {
    if (!confirm('确定要删除此账号吗？')) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/accounts/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadAccounts();
            alert('账号已删除');
        } else {
            alert('删除失败');
        }
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function deleteKey(id) {
    if (!confirm('确定要删除此API密钥吗？')) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/api-keys/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadApiKeys();
            alert('API密钥已删除');
        } else {
            alert('删除失败');
        }
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function revokeKey(id) {
    if (!confirm('确定要吊销此API密钥吗？')) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/api-keys/${id}/revoke`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadApiKeys();
            alert('API密钥已吊销');
        } else {
            alert('吊销失败');
        }
    } catch (error) {
        alert('吊销失败: ' + error.message);
    }
}

// Refresh account token
async function refreshAccountToken(id) {
    if (!confirm('确定要刷新此账号的 Token 吗？')) return;
    
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/accounts/${id}/refresh-token`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`Token 刷新成功！\n过期时间: ${result.expires_in} 秒`);
            loadAccounts();
        } else {
            const error = await response.json();
            alert('刷新失败: ' + error.detail);
        }
    } catch (error) {
        alert('刷新失败: ' + error.message);
    }
}

// View account statistics
async function viewAccountStats(id) {
    try {
        const response = await fetchWithAuth(`${API_BASE}/admin/accounts/${id}/stats`);
        if (response.ok) {
            const stats = await response.json();
            
            // Format token info
            let tokenInfo = '未缓存';
            if (stats.token_info && stats.token_info.cached) {
                const expiresAt = stats.token_info.expires_at ? new Date(stats.token_info.expires_at).toLocaleString() : '未知';
                tokenInfo = `已缓存 (${stats.token_info.is_valid ? '有效' : '已过期'})\n过期时间: ${expiresAt}`;
            }
            
            // Format auto recover time
            let autoRecover = stats.auto_recover_at ? new Date(stats.auto_recover_at).toLocaleString() : '无';
            
            // Format error info
            let errorInfo = `错误计数: ${stats.error_count || 0}/5`;
            if (stats.last_error_time) {
                errorInfo += `\n最后错误: ${new Date(stats.last_error_time).toLocaleString()}`;
            }
            if (stats.health_check_error) {
                errorInfo += `\n错误信息: ${stats.health_check_error}`;
            }
            
            const message = `账号统计信息: ${stats.account_name}

状态:
- 活跃: ${stats.is_active ? '是' : '否'}
- 健康: ${stats.is_healthy ? '是' : '否'}

使用统计:
- 总请求数: ${stats.total_requests || 0}
- 总Token数: ${stats.total_tokens || 0}
- 最后使用: ${stats.last_used ? new Date(stats.last_used).toLocaleString() : '从未使用'}

限流设置:
- 每分钟请求限制: ${stats.requests_per_minute || 0}
- 当前RPM: ${stats.current_rpm || 0}
- RPM重置时间: ${stats.rpm_reset_at ? new Date(stats.rpm_reset_at).toLocaleString() : '无'}

健康检查:
${errorInfo}
- 最后检查: ${stats.last_health_check ? new Date(stats.last_health_check).toLocaleString() : '从未检查'}
- 自动恢复时间: ${autoRecover}

Token信息:
${tokenInfo}

创建时间: ${new Date(stats.created_at).toLocaleString()}
更新时间: ${new Date(stats.updated_at).toLocaleString()}`;
            
            alert(message);
        } else {
            const error = await response.json();
            alert('获取统计失败: ' + error.detail);
        }
    } catch (error) {
        alert('获取统计失败: ' + error.message);
    }
}

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
});

// Load dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        window.location.href = '/admin/login';
        return;
    }

    showSection('dashboard');
    fetchWithAuth(`${API_BASE}/admin/stats/accounts`)
        .then(() => {
            loadDashboard();
        })
        .catch((error) => {
            console.error('API key validation failed:', error);
            clearApiKey();
            window.location.href = '/admin/login';
        });
});

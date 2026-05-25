#!/bin/bash

# DbPaw MCP Server 配置脚本
# 此脚本帮助用户配置 Claude Desktop 和 Cursor 以使用 DbPaw MCP Server

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            echo "macos"
            ;;
        Linux*)
            echo "linux"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

# 获取 dbpaw-mcp 路径
get_mcp_path() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local project_root="$(dirname "$script_dir")"
    local mcp_path="$project_root/src-tauri/target/debug/dbpaw-mcp"
    
    if [ -f "$mcp_path" ]; then
        echo "$mcp_path"
    else
        echo ""
    fi
}

# Claude Desktop 配置路径
get_claude_config_path() {
    local os=$(detect_os)
    case "$os" in
        macos)
            echo "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
            ;;
        linux)
            echo "$HOME/.config/Claude/claude_desktop_config.json"
            ;;
        windows)
            echo "$APPDATA/Claude/claude_desktop_config.json"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Cursor 配置路径
get_cursor_config_path() {
    local os=$(detect_os)
    case "$os" in
        macos|linux)
            echo "$HOME/.cursor/mcp.json"
            ;;
        windows)
            echo "$APPDATA/Cursor/mcp.json"
            ;;
        *)
            echo ""
            ;;
    esac
}

# 生成配置 JSON
generate_config() {
    local mcp_path="$1"
    cat <<EOF
{
  "mcpServers": {
    "dbpaw": {
      "command": "$mcp_path",
      "args": []
    }
  }
}
EOF
}

# 写入配置文件
write_config() {
    local config_path="$1"
    local config_dir="$(dirname "$config_path")"
    local mcp_path="$2"
    local app_name="$3"
    
    # 创建目录（如果不存在）
    mkdir -p "$config_dir"
    
    # 检查配置文件是否存在
    if [ -f "$config_path" ]; then
        echo -e "${YELLOW}⚠ 配置文件已存在: $config_path${NC}"
        echo -e "${YELLOW}  请手动添加以下配置:${NC}"
        echo ""
        generate_config "$mcp_path"
        echo ""
        return 1
    fi
    
    # 写入配置
    generate_config "$mcp_path" > "$config_path"
    echo -e "${GREEN}✓ 已生成 $app_name 配置: $config_path${NC}"
    return 0
}

# 主函数
main() {
    echo "=========================================="
    echo "  DbPaw MCP Server 配置工具"
    echo "=========================================="
    echo ""
    
    # 检测操作系统
    local os=$(detect_os)
    echo -e "${GREEN}操作系统:${NC} $os"
    
    # 获取 dbpaw-mcp 路径
    local mcp_path=$(get_mcp_path)
    if [ -z "$mcp_path" ]; then
        echo -e "${RED}✗ 未找到 dbpaw-mcp 二进制文件${NC}"
        echo "  请先运行: cd src-tauri && cargo build --bin dbpaw-mcp"
        exit 1
    fi
    echo -e "${GREEN}MCP Server 路径:${NC} $mcp_path"
    echo ""
    
    # 询问用户选择
    echo "请选择要配置的应用:"
    echo "  1) Claude Desktop"
    echo "  2) Cursor"
    echo "  3) 两者都配置"
    echo "  4) 仅显示配置内容"
    echo ""
    read -p "请输入选项 (1-4): " choice
    
    case "$choice" in
        1)
            local claude_config=$(get_claude_config_path)
            if [ -n "$claude_config" ]; then
                write_config "$claude_config" "$mcp_path" "Claude Desktop"
            else
                echo -e "${RED}✗ 无法确定 Claude Desktop 配置路径${NC}"
            fi
            ;;
        2)
            local cursor_config=$(get_cursor_config_path)
            if [ -n "$cursor_config" ]; then
                write_config "$cursor_config" "$mcp_path" "Cursor"
            else
                echo -e "${RED}✗ 无法确定 Cursor 配置路径${NC}"
            fi
            ;;
        3)
            local claude_config=$(get_claude_config_path)
            local cursor_config=$(get_cursor_config_path)
            
            if [ -n "$claude_config" ]; then
                write_config "$claude_config" "$mcp_path" "Claude Desktop"
            fi
            
            if [ -n "$cursor_config" ]; then
                write_config "$cursor_config" "$mcp_path" "Cursor"
            fi
            ;;
        4)
            echo ""
            echo "配置内容:"
            echo "=========================================="
            generate_config "$mcp_path"
            echo "=========================================="
            ;;
        *)
            echo -e "${RED}无效选项${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo "=========================================="
    echo "配置完成！"
    echo ""
    echo "使用方法:"
    echo "  1. 重启 Claude Desktop 或 Cursor"
    echo "  2. 在对话中使用 DbPaw 工具"
    echo ""
    echo "环境变量（可选）:"
    echo "  DBPAW_MCP_ALLOW_WRITES=1    允许写操作"
    echo "  DBPAW_MCP_ALLOW_DANGEROUS=1 允许危险操作"
    echo "  DBPAW_MCP_MAX_ROWS=100      最大返回行数"
    echo "=========================================="
}

# 运行主函数
main

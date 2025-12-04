import re

# 读取CSS文件
with open(r'D:\1.code\1.code\1.ProjectManagement\dev-projects\new\code\chajian\plugin\chrome\popup\styles\font-awesome.all.min.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

print(f"CSS文件大小: {len(css_content)} 字符\n")

# 查找 fa-info-circle 规则
info_match = re.search(r'\.fa-(circle-)?info-circle:before[^}]{0,100}', css_content)
if info_match:
    print("找到 fa-info-circle 规则:")
    print(info_match.group(0))
    print()
else:
    print("未找到 fa-info-circle\n")

# 查找任意一个content规则
content_match = re.search(r'\.fa-[a-z-]+:before\{content:"([^"]*)"\}', css_content)
if content_match:
    print("找到示例 content 规则:")
    print(content_match.group(0))
    print(f"Content值: '{content_match.group(1)}'")
    print(f"Content值长度: {len(content_match.group(1))}")
    if len(content_match.group(1)) > 0:
        print(f"Content值16进制: {[hex(ord(c)) for c in content_match.group(1)]}")
    print()
else:
    print("未找到任何 content 规则\n")

# 统计包含content的规则数量
all_contents = re.findall(r'content:"([^"]*)"', css_content)
print(f"找到 {len(all_contents)} 个 content 规则")
if len(all_contents) > 0:
    non_empty = [c for c in all_contents if len(c) > 0]
    print(f"其中非空的有 {len(non_empty)} 个")
    if len(non_empty) > 0:
        print(f"第一个非空content: '{non_empty[0]}' (长度: {len(non_empty[0])})")
        print(f"16进制: {[hex(ord(c)) for c in non_empty[0]]}")

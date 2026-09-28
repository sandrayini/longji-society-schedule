# 龙脊学社 v2026.08.28 存档说明

**存档日期**: 2026-08-28
**commit**: bbb4709
**tag**: v2026.08.28

## 当前版本功能
- 活动管理（时间待定/投票两种类型）
- 成员管理（管理员/成员角色）
- 空闲日历（网格、排行、共同空闲统计）
- 上海时区统一解析
- 投票活动（单选/多选/匿名）

## 数据库快照
- 备份文件: `/home/ubuntu/backups/longji-20260828-pre-update.db`
- activities: 3
- users: 9
- submissions: 19

## 回滚方式
```bash
cd /home/ubuntu/longji-society-schedule
git checkout v2026.08.28
sqlite3 data/app.db ".restore '/home/ubuntu/backups/longji-20260828-pre-update.db'"
pm2 restart longji-society
```

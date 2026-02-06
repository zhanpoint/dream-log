from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "将当前数据库中的所有表转换为 utf8mb4 字符集及 0900 排序规则（MySQL 8）。"

    SAFE_FOR_DEPLOYMENT = True

    def add_arguments(self, parser):
        parser.add_argument(
            "--collation",
            default="utf8mb4_0900_ai_ci",
            help="指定排序规则（默认 utf8mb4_0900_ai_ci，MySQL 5.7 可用 utf8mb4_unicode_ci）",
        )

    def handle(self, *args, **options):
        collation = options["collation"]
        charset = "utf8mb4"

        with connection.cursor() as cursor:
            cursor.execute("SELECT DATABASE()")
            (database_name,) = cursor.fetchone()

        if not database_name:
            self.stderr.write(self.style.ERROR("无法获取当前数据库名。"))
            return

        self.stdout.write(f"当前数据库: {database_name}")

        # 在转换期间关闭外键检查，避免外键两端短暂不一致导致的 3780 错误
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS=0")

        try:
            alter_db_sql = (
                f"ALTER DATABASE `{database_name}` CHARACTER SET {charset} COLLATE {collation};"
            )
            with connection.cursor() as cursor:
                self.stdout.write(f"执行: {alter_db_sql}")
                cursor.execute(alter_db_sql)

            fetch_tables_sql = (
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = %s AND table_type = 'BASE TABLE'"
            )
            with connection.cursor() as cursor:
                cursor.execute(fetch_tables_sql, [database_name])
                tables = [row[0] for row in cursor.fetchall()]

            if not tables:
                self.stdout.write(self.style.WARNING("未发现需要转换的表。"))
                return

            success_count = 0
            failed_tables = []
            for table in tables:
                convert_sql = (
                    f"ALTER TABLE `{table}` CONVERT TO CHARACTER SET {charset} COLLATE {collation};"
                )
                try:
                    with connection.cursor() as cursor:
                        self.stdout.write(f"转换表: {table}")
                        cursor.execute(convert_sql)
                    success_count += 1
                except Exception as exc:
                    failed_tables.append((table, str(exc)))
                    self.stderr.write(self.style.ERROR(f"转换失败: {table} -> {exc}"))

            if failed_tables:
                self.stdout.write(self.style.WARNING(
                    f"部分表转换失败，共 {len(failed_tables)} 张；其余 {success_count} 张已成功。"
                ))
            else:
                self.stdout.write(self.style.SUCCESS("✅ 所有表已转换为 utf8mb4。"))
        finally:
            with connection.cursor() as cursor:
                cursor.execute("SET FOREIGN_KEY_CHECKS=1")



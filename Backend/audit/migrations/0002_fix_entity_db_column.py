from django.db import migrations, models


class Migration(migrations.Migration):
    """
    La colonne en base s'appelle 'entity' (bonne orthographe).
    Le modèle avait 'enitity' sans db_column, causant un mismatch.
    On met à jour l'état Django uniquement, sans toucher au schéma PostgreSQL.
    """

    dependencies = [
        ('audit', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='auditlog',
                    name='enitity',
                    field=models.CharField(
                        db_column='entity',
                        help_text='Table name',
                        max_length=255,
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]

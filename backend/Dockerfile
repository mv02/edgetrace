FROM python:3.13 AS build
WORKDIR /code
COPY ./requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt
COPY ./app .

FROM build AS prod
CMD ["fastapi", "run", "app/main.py"]

FROM build AS dev
CMD ["fastapi", "dev", "--host", "0.0.0.0", "app/main.py"]

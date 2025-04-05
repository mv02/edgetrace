#ifndef LIST_H
#define LIST_H

#include "invoke.h"
#include "method.h"

#define DEFAULT_CAPACITY 1024

typedef struct map {
    int capacity;
    void** items;
} map_t;

typedef struct method_map {
    int capacity;
    method_t** items;
} method_map_t;

typedef struct invoke_map {
    int capacity;
    invoke_t** items;
} invoke_map_t;

method_map_t* method_map_create();
invoke_map_t* invoke_map_create();
void method_map_destroy(method_map_t* map);
void invoke_map_destroy(invoke_map_t* map);

void method_map_add(method_map_t* map, method_t* method);
void invoke_map_add(invoke_map_t* map, invoke_t* invoke);
method_t* method_map_get(method_map_t* map, int method_id);
invoke_t* invoke_map_get(invoke_map_t* map, int invoke_id);

#endif

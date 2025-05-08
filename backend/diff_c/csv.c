#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "csv.h"
#include "hashtable.h"
#include "invoke.h"
#include "map.h"
#include "method.h"

#define MAX_LINE_LEN 2048

char* get_file_path(char* dirname, char* filename)
{
    char* path = malloc(strlen(dirname) + strlen(filename) + 2);
    if (path == NULL) {
        return NULL;
    }

    strcpy(path, dirname);
    strcat(path, "/");
    strcat(path, filename);

    return path;
}

void csv_load_methods(char* dirname, ht** methods, method_map_t* methods_by_id)
{
    char* path = get_file_path(dirname, "call_tree_methods.csv");
    printf("Opening file %s\n", path);

    FILE* f = fopen(path, "r");
    free(path);
    char line[MAX_LINE_LEN];
    fgets(line, MAX_LINE_LEN, f);

    while (fgets(line, MAX_LINE_LEN, f) != NULL) {
        int i = 0;
        char* fields[8] = {};
        char* s = strtok(line, ",\n");
        do {
            fields[i++] = s;
        } while ((s = strtok(NULL, ",\n")) != NULL);

        // When the flags field is empty
        if (i < 8) {
            fields[7] = fields[6];
            fields[6] = "";
        }

        method_t* method = method_create(
            atoi(fields[0]), fields[1], fields[2], strcmp(fields[3], "empty") == 0 ? "" : fields[3],
            fields[4], fields[5], fields[6], strcmp(fields[7], "true") == 0);
        ht_insert(*methods, method->qualified_name, method);
        method_map_add(methods_by_id, method);
    }

    fclose(f);
}

void csv_load_invokes(char* dirname, invoke_t** invokes, method_map_t* methods_by_id,
                      invoke_map_t* invokes_by_id)
{
    char* path = get_file_path(dirname, "call_tree_invokes.csv");
    printf("Opening file %s\n", path);

    FILE* f = fopen(path, "r");
    free(path);
    char line[MAX_LINE_LEN];
    fgets(line, MAX_LINE_LEN, f);

    invoke_t* prev_invoke = NULL;

    while (fgets(line, MAX_LINE_LEN, f) != NULL) {
        int i = 0;
        char* fields[5] = {};
        char* s = strtok(line, ",\n");
        do {
            fields[i++] = s;
        } while ((s = strtok(NULL, ",\n")) != NULL);

        method_t* method = method_map_get(methods_by_id, atoi(fields[1]));
        method_t* target = method_map_get(methods_by_id, atoi(fields[3]));
        invoke_t* invoke = invoke_create(atoi(fields[0]), method, target, fields[2],
                                         strcmp(fields[4], "true") == 0);
        invoke_map_add(invokes_by_id, invoke);

        if (prev_invoke != NULL) {
            prev_invoke->next = invoke;
        } else {
            *invokes = invoke;
        }
        prev_invoke = invoke;
    }

    fclose(f);
}

void csv_load_targets(char* dirname, method_map_t* methods_by_id, invoke_map_t* invokes_by_id)
{
    char* path = get_file_path(dirname, "call_tree_targets.csv");
    printf("Opening file %s\n", path);

    FILE* f = fopen(path, "r");
    free(path);
    char line[MAX_LINE_LEN];
    fgets(line, MAX_LINE_LEN, f);

    while (fgets(line, MAX_LINE_LEN, f) != NULL) {
        int i = 0;
        char* fields[2] = {};
        char* s = strtok(line, ",\n");
        do {
            fields[i++] = s;
        } while ((s = strtok(NULL, ",\n")) != NULL);

        invoke_t* invoke = invoke_map_get(invokes_by_id, atoi(fields[0]));
        method_t* target = method_map_get(methods_by_id, atoi(fields[1]));
        invoke_add_call_target(invoke, target);
    }

    fclose(f);
}

void csv_save_methods(char* dirname, ht* methods)
{
    char* path = get_file_path(dirname, "methods.csv");
    printf("Opening file %s\n", path);

    FILE* f = fopen(path, "w");
    free(path);
    fputs("Id,Name,Type,Parameters,Return,Display,Flags,IsEntryPoint,PresentInOther\n", f);

    ht_iter it = ht_iterator(methods);
    while (ht_next(&it)) {
        method_t* m = it.value;
        fprintf(f, "%d,%s,%s,%s,%s,%s,%s,%s,%s\n", m->id, m->name, m->declared_type, m->params,
                m->return_type, m->display, m->flags, m->is_entrypoint ? "true" : "false",
                m->equivalent != NULL ? "true" : "false");
    }

    fclose(f);
}
